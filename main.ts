import { KdbxEntry, ProtectedValue, KdbxGroup, KdbxUuid, ByteUtils } from "kdbxweb";

export class KdbxPlaceholders {

    majorVersion: number = 3; // Defaults to 3, unless told otherwise

    constructor (private plugins?) {
    }

    public hasReferences (fieldValue) {
        return !!/\{.+\}/.test(fieldValue || "");
    }

    /*
	 * Process all references found in fieldValue to their final values
	 */
    public processAllReferences (
        majorVersion: number,
        fieldValue: string,
        currentEntry: KdbxEntry,
        getAllEntriesIterator: () => IterableIterator<KdbxEntry>,
        recursionLimit: number = 2
    ) {
        this.majorVersion = majorVersion; //update the major version if it changed.
        const re = /(\{[^\{\}]+\})/g;
        let expressions = re.exec(fieldValue || "");
        if (!expressions) return fieldValue; //no references

        let result = "";
        let lastIndex = 0;
        while (expressions) {
            if (expressions.index >= lastIndex) {
                result += fieldValue.substring(lastIndex, expressions.index);
            }
            result += this.resolveReference(expressions[1], currentEntry, getAllEntriesIterator);
            lastIndex = expressions.index + expressions[1].length;
            expressions = re.exec(fieldValue || "");
        }

        if (lastIndex < fieldValue.length) {
            result += fieldValue.substring(lastIndex, fieldValue.length);
        }

        if (result === fieldValue) return fieldValue;

        return this.processAllReferences(3, result, currentEntry, getAllEntriesIterator, --recursionLimit);
    }

    public resolveReference (referenceText: string, currentEntry: KdbxEntry, getAllEntriesIterator: () => IterableIterator<KdbxEntry>) {

        // Remove comments
        if (/\{C:.+\}/.test(referenceText)) return "";

        // Plugins can run before built-in behaviour to enable customisation

        if (this.plugins) {
            for (const plugin of this.plugins) {
                if (!plugin.replaceMatch) {
                    continue;
                }
                if (plugin.isMatch && plugin.isMatch(referenceText)) {
                    if (plugin.onMatch && !plugin.onMatch(referenceText, currentEntry)) {
                        continue;
                    }
                    return plugin.replaceMatch(referenceText, currentEntry);
                }
            }
        }

        const localParts = /^\{([a-zA-Z]+)\}$/.exec(referenceText);
        if (localParts) {
            // local field
            switch (localParts[1].toUpperCase()) {
            case "TITLE":
                return this.keewebGetDecryptedFieldValue(currentEntry, "Title");
            case "USERNAME":
                return this.keewebGetDecryptedFieldValue(currentEntry, "UserName");
            case "URL":
                return this.keewebGetDecryptedFieldValue(currentEntry, "URL");
            case "NOTES":
                return this.keewebGetDecryptedFieldValue(currentEntry, "Notes");
            case "PASSWORD":
                return this.keewebGetDecryptedFieldValue(currentEntry, "Password");
            }
        }

        // URL:things will go here

        const urlString = /^\{URL:([A-Za-z]+)\}/.exec(referenceText);
        if (urlString) {
            return this.urlPlaceholder(urlString[1], currentEntry);
        }

        // https://stackoverflow.com/questions/2970525/converting-any-string-into-camel-case
        const camelize =str => {
            return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (letter, index) {
                return index === 0 ? letter.toLowerCase() : letter.toUpperCase();
            }).replace(/\s+/g, "");
        };

        const customLocalString = /^\{S:([a-zA-Z]+)\}$/.exec(referenceText);
        if (customLocalString) {
            const camelCase = camelize(customLocalString[1]);
            return currentEntry.fields.get(camelCase);
        }

        const refString = /^\{REF:(T|U|P|A|N|I)@(T|U|P|A|N|I|O):(.+)\}$/.exec(referenceText);
        if (refString) {

            if (this.majorVersion < 3) {
                throw new Error("Database Version Not Supported");
            }

            const wantedField = this.getPropertyNameFromCode(refString[1]);
            const searchIn = this.getPropertyNameFromCode(refString[2]);
            const text = refString[3];

            if (!getAllEntriesIterator) {
                throw new Error("getAllEntriesIterator must be supplied when a string contains a reference to another entry");
            }

            const allEntries = getAllEntriesIterator();

            for (const e of allEntries) {
                if (this.entryMatches(searchIn, e, text)) return this.keewebGetDecryptedFieldValue(e, wantedField);
            }
        }

        return referenceText;
    }

    public changeUUID (currentEntry: KdbxEntry, defaultGroup: KdbxGroup, newId: KdbxUuid) {
        const oldId = currentEntry.uuid;
        currentEntry.uuid = newId;
        this.repairUUID(defaultGroup, newId, oldId);
    }

    public repairUUID (defaultGroup: KdbxGroup, newId: KdbxUuid, oldId: KdbxUuid) {
        const allEntries = entryGenerator(defaultGroup);

        for (const e of allEntries) {
            Object.keys(e.fields).forEach(k => {
                const val = this.keewebGetDecryptedFieldValue(e, k);
                const newVal = this.replaceUUIDForAllReferences(val, oldId, newId);
                this.keewebSetDecryptedFieldValue(e, k, newVal);
            });
        }
    }

    private replaceUUIDForAllReferences (
        fieldValue: string,
        oldId: KdbxUuid,
        newId: KdbxUuid
    ) {
        const re = /(\{[^\{\}]+\})/g;
        let expressions = re.exec(fieldValue || "");
        if (!expressions) return fieldValue; //no references

        let result = "";
        let lastIndex = 0;
        while (expressions) {
            if (expressions.index >= lastIndex) {
                result += fieldValue.substring(lastIndex, expressions.index);
            }
            result += this.replaceUUIDForSingleReference(expressions[1], oldId, newId);
            lastIndex = expressions.index + expressions[1].length;
            expressions = re.exec(fieldValue || "");
        }

        if (lastIndex < fieldValue.length) {
            result += fieldValue.substring(lastIndex, fieldValue.length);
        }

        return result;
    }

    private replaceUUIDForSingleReference (
        value: string,
        oldId: KdbxUuid,
        newId: KdbxUuid
    ) {
        const regex = new RegExp(`${this.uuidToHex(oldId)}`, "gi");
        return value.replace(regex, this.uuidToHex(newId));
    }

    private entryMatches (searchIn: string, e: KdbxEntry, text: string) {
        const textUpper = text.toUpperCase();
        if (searchIn === "*") {
            return [...e.fields.values()].some( (v) => {
                return String(v || "").toUpperCase().indexOf(textUpper) !== -1;
            });
        } else {
            return String((searchIn === "uuid" ? this.uuidToHex(e.uuid) : e.fields.get(searchIn)) || "")
                .toUpperCase().indexOf(textUpper) !== -1;
        }
    }

    private urlPlaceholder (urlType: string, currentEntry: KdbxEntry) {
        const urlValue = this.keewebGetDecryptedFieldValue(currentEntry, "URL");
        if (!urlValue) return "";
        if (urlType === "RMVSCM") {
            return this.removeScheme(urlValue);
        }
        const url = new URL(urlValue);
        switch (urlType) {
        case "SCM": return url.protocol.replace(":", "");
        case "HOST": return url.host;
        case "PORT": return url.port || (url.protocol === "https:" ? "443" : "80");
        case "PATH": return url.pathname;
        case "QUERY": return url.search;
        case "USERINFO": const components = [url.username, url.password]; return components.join(":");
        case "USERNAME": return url.username;
        case "PASSWORD": return url.password;
        default: return "";
        }
    }

    private removeScheme (strUrl: string) {
        if (!strUrl) return "";

        const nNetScheme = strUrl.indexOf("://");
        const nShScheme = strUrl.indexOf(":/");
        const nSmpScheme = strUrl.indexOf(":");

        if ((nNetScheme < 0) && (nShScheme < 0) && (nSmpScheme < 0)) {
            return strUrl; // No scheme
        }

        const nMin = Math.min(Math.min((nNetScheme >= 0) ? nNetScheme : Number.MAX_SAFE_INTEGER,
            (nShScheme >= 0) ? nShScheme : Number.MAX_SAFE_INTEGER),
            (nSmpScheme >= 0) ? nSmpScheme : Number.MAX_SAFE_INTEGER);

        if (nMin === nNetScheme) return strUrl.substring(nMin + 3);
        if (nMin === nShScheme) return strUrl.substring(nMin + 2);
        return strUrl.substring(nMin + 1);
    }

    private keewebGetDecryptedFieldValue (entry: KdbxEntry, fieldName: string) {
        const field = fieldName === "uuid" ? this.uuidToHex(entry.uuid) : entry.fields.get(fieldName);
        if (field === undefined || !(field instanceof ProtectedValue)) {
            return field || ""; //not an encrypted field
        }
        return field.getText();
    }

    private keewebSetDecryptedFieldValue (entry: KdbxEntry, fieldName: string, newValue: string) {
        if (fieldName === "uuid") {
            entry.uuid = new KdbxUuid(newValue);
        } else {
            let fn = entry.fields.get(fieldName);
            if (fn === undefined || !(fn instanceof ProtectedValue)) {
                fn = newValue; //not an encrypted field
            } else {
                fn = ProtectedValue.fromString(newValue);
            }
        }
    }

    private getPropertyNameFromCode (code) {
        switch (code) {
        case "T":
            return "Title";
        case "U":
            return "UserName";
        case "P":
            return "Password";
        case "A":
            return "URL";
        case "N":
            return "Notes";
        case "I":
            return "uuid";
        case "O":
            return "*";
        }

        return "";
    }

    private uuidToHex (uuid: KdbxUuid) {
        return ByteUtils.bytesToHex(uuid.toBytes()!).toUpperCase();
    }
}

function * entryGenerator (group): IterableIterator<KdbxEntry> {
    if (group.entries) {
        for (let i = 0; i < group.entries.length; i++) {
            yield group.entries[i];
        }
    }
    if (group.groups) {
        for (let i = 0; i < group.groups.length; i++) {
            yield * entryGenerator(group.groups[i]);
        }
    }
}

