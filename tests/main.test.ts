import { ProtectedValue, Kdbx, Credentials, KdbxUuid, ByteUtils } from "kdbxweb";
import { KdbxPlaceholders } from "../main";

// It's not possible to unit test individual parts of the kdbxweb class hierarchy :-(
const db = Kdbx.create(new Credentials(ProtectedValue.fromString("password")), "DB name");

    // http://keepass.info/help/base/fieldrefs.html

const UUID1 = KdbxUuid.random();
const UUID2 = KdbxUuid.random();
const UUID3 = KdbxUuid.random();
const UUID4 = KdbxUuid.random();
const UUID5 = KdbxUuid.random();
const UUID2h = ByteUtils.bytesToHex(UUID2.toBytes() as Uint8Array);
//const UUID4h = ByteUtils.bytesToHex(UUID4.toBytes() as Uint8Array);
const UUID5h = ByteUtils.bytesToHex(UUID5.toBytes() as Uint8Array);

const refService = new KdbxPlaceholders();
db.createDefaultGroup();
const entry = db.createEntry(db.getDefaultGroup());
entry.uuid = UUID1;
entry.fields = {
    Title: "Sample Title",
    UserName: "UserX",
    URL: "http://keepass.info/",
    Notes: "Some notes",
    Password: ProtectedValue.fromString("Some password"),
    emailAddress: "something@keepass.info"
};
const entry2 = db.createEntry(db.getDefaultGroup());
entry2.uuid = UUID2;
entry2.fields = {
    Title: "Sample Title2",
    UserName: "UserX2",
    URL: "http://keepass.info/2",
    Notes: "Some notes2",
    Password: ProtectedValue.fromString("Some password2"),
    emailAddress: "something2@keepass.info"
};
const entry3 = db.createEntry(db.getDefaultGroup());
entry3.uuid = UUID3;
entry3.fields = {
    Title: "Sample Title3",
    UserName: "UserX3",
    URL: "http://keepass.info:1234/3",
    Notes: "Some notes3",
    Password: ProtectedValue.fromString("Some password3"),
    emailAddress: "something3@keepass.info"
};
const entry4= db.createEntry(db.getDefaultGroup());
entry4.uuid = UUID4;
entry4.fields = {
    Title: ProtectedValue.fromString("Sample Title4"),
    UserName: `{REF:U@I:${UUID2h}}`,
    URL: "https://urluser:urlpass@keepass.info/4?s=1",
    Notes: "Some notes4",
    Password: ProtectedValue.fromString(`{REF:P@I:${UUID2h}}`),
    emailAddress: "something4@keepass.info"
};
function* entryGenerator (group: any) {
    for (let i=0; i<group.entries.length; i++) {
        yield group.entries[i];
    }
}
function entries () {
    return entryGenerator(db.getDefaultGroup());
}

let db2;
const refService2 = new KdbxPlaceholders();
let chgEntry;
let chgEntry2;
let chgEntry3;
let chgEntry4;

const createImmutableDatabase = function () {
    db2 = Kdbx.create(new Credentials(ProtectedValue.fromString("password")), "DB name");
    db2.createDefaultGroup();
    chgEntry = db2.createEntry(db2.getDefaultGroup());
    chgEntry.uuid = UUID1;
    chgEntry.fields = {
        Title: "Sample Title",
        UserName: "UserX",
        URL: "http://keepass.info/",
        Notes: "Some notes",
        Password: ProtectedValue.fromString("Some password"),
        emailAddress: "something@keepass.info"
    };
    chgEntry2 = db2.createEntry(db2.getDefaultGroup());
    chgEntry2.uuid = UUID2;
    chgEntry2.fields = {
        Title: "Sample Title2",
        UserName: "UserX2",
        URL: "http://keepass.info/2",
        Notes: "Some notes2",
        Password: ProtectedValue.fromString("Some password2"),
        emailAddress: "something2@keepass.info"
    };
    chgEntry3 = db2.createEntry(db2.getDefaultGroup());
    chgEntry3.uuid = UUID3;
    chgEntry3.fields = {
        Title: "Sample Title3",
        UserName: "UserX3",
        URL: "http://keepass.info:1234/3",
        Notes: "Some notes3",
        Password: ProtectedValue.fromString("Some password3"),
        emailAddress: "something3@keepass.info"
    };
    chgEntry4= db2.createEntry(db2.getDefaultGroup());
    chgEntry4.uuid = UUID4;
    chgEntry4.fields = {
        Title: ProtectedValue.fromString("Sample Title4"),
        UserName: `{REF:U@I:${UUID2h}}`,
        URL: "https://urluser:urlpass@keepass.info/4?s=1",
        Notes: "Some notes4",
        Password: ProtectedValue.fromString(`{REF:P@I:${UUID2h}}`),
        emailAddress: "something4@keepass.info"
    };
};

function* chgEntryGenerator (group: any) {
    for (let i=0; i<group.entries.length; i++) {
        yield group.entries[i];
    }
}
function chgEntries () {
    return chgEntryGenerator(db2.getDefaultGroup());
}

describe("Intra-entry references", () => {

    test("resolve title when Protected to unprotected text", async () => {
        expect(refService.resolveReference("{TITLE}", entry4, entries)).toEqual(entry4.fields.Title.getText());
    });
    test("resolve title", async () => {
        expect(refService.resolveReference("{TITLE}", entry, entries)).toEqual(entry.fields.Title);
    });
    test("resolve username", async () => {
        expect(refService.resolveReference("{USERNAME}", entry, entries)).toEqual(entry.fields.UserName);
    });
    test("resolve url", async () => {
        expect(refService.resolveReference("{URL}", entry, entries)).toEqual(entry.fields.URL);
    });
    test("resolve url without scheme name", async () => {
        expect(refService.resolveReference("{URL:RMVSCM}", entry4, entries)).toEqual("urluser:urlpass@keepass.info/4?s=1");
    });
    test("resolve url scheme name", async () => {
        expect(refService.resolveReference("{URL:SCM}", entry4, entries)).toEqual("https");
    });
    test("resolve url host", async () => {
        expect(refService.resolveReference("{URL:HOST}", entry4, entries)).toEqual("keepass.info");
    });
    test("resolve explicit url port", async () => {
        expect(refService.resolveReference("{URL:PORT}", entry3, entries)).toEqual("1234");
    });
    test("resolve implicit url port", async () => {
        expect(refService.resolveReference("{URL:PORT}", entry4, entries)).toEqual("443");
    });
    test("resolve url path", async () => {
        expect(refService.resolveReference("{URL:PATH}", entry4, entries)).toEqual("/4");
    });
    test("resolve url query", async () => {
        expect(refService.resolveReference("{URL:QUERY}", entry4, entries)).toEqual("?s=1");
    });
    test("resolve url user info", async () => {
        expect(refService.resolveReference("{URL:USERINFO}", entry4, entries)).toEqual("urluser:urlpass");
    });
    test("resolve url username", async () => {
        expect(refService.resolveReference("{URL:USERNAME}", entry4, entries)).toEqual("urluser");
    });
    test("resolve url password", async () => {
        expect(refService.resolveReference("{URL:PASSWORD}", entry4, entries)).toEqual("urlpass");
    });
    test("resolve password to unprotected text", async () => {
        expect(refService.resolveReference("{PASSWORD}", entry, entries)).toEqual(entry.fields.Password.getText());
    });
    test("resolve notes", async () => {
        expect(refService.resolveReference("{NOTES}", entry, entries)).toEqual(entry.fields.Notes);
    });
    test("not be case-sensitive", async () => {
        expect(refService.resolveReference("{noTes}", entry, entries)).toEqual(entry.fields.Notes);
    });
    test("return the expression back if not able to evaluate", async () => {
        expect(refService.resolveReference("{sdaads}", entry, entries)).toEqual("{sdaads}");
    });
    test("support a custom field name", async () => {
        expect(refService.resolveReference("{S:EmailAddress}", entry, entries)).toEqual(entry.fields.emailAddress);
    });
    test("comment is removed", async () => {
        expect(refService.processAllReferences(3, "a{USERNAME}{C:Comment}b", entry, entries)).toEqual("a" + entry.fields.UserName + "b");
    });
});

describe("Cross-entry references", () => {
    test("resolve wanted title (UPPER)", async () => {
        expect(refService.resolveReference(`{REF:T@I:${UUID2h.toUpperCase()}}`, entry, entries)).toEqual(entry2.fields.Title);
    });
    test("resolve wanted title (lower)", async () => {
        expect(refService.resolveReference(`{REF:T@I:${UUID2h}}`, entry, entries)).toEqual(entry2.fields.Title);
    });
    test("resolve wanted title (mIXed)", async () => {
        const UUID2hMixed = UUID2h.replace(/([a-f])/, (a, x) => a.replace(x, x.toUpperCase()));
        expect(refService.resolveReference(`{REF:T@I:${UUID2hMixed}}`, entry, entries)).toEqual(entry2.fields.Title);
    });
    // https://github.com/facebook/jest/issues/7780 triggers when kdbxweb decoded to UTF8 so this test can't pass until jest is fixed
    // test("resolve wanted title when Protected to unprotected text", async () => {
    //     expect(refService.resolveReference(`{REF:T@I:${UUID4h}}`, entry, entries)).toEqual("Sample Title4");
    // });
    test("resolve wanted username", async () => {
        expect(refService.resolveReference(`{REF:U@I:${UUID2h}}`, entry, entries)).toEqual(entry2.fields.UserName);
    });
    test("resolve wanted url", async () => {
        expect(refService.resolveReference(`{REF:A@I:${UUID2h}}`, entry, entries)).toEqual(entry2.fields.URL);
    });
    // https://github.com/facebook/jest/issues/7780 triggers when kdbxweb decoded to UTF8 so this test can't pass until jest is fixed
    // test("resolve wanted password to unprotected text", async () => {
    //     expect(refService.resolveReference(`{REF:P@I:${UUID2h}}`, entry, entries)).toEqual("Some password2");
    // });
    test("resolve wanted notes", async () => {
        expect(refService.resolveReference(`{REF:N@I:${UUID2h}}`, entry, entries)).toEqual(entry2.fields.Notes);
    });
    test("resolve wanted id", async () => {
        expect(refService.resolveReference(`{REF:I@I:${UUID2h}}`, entry, entries)).toEqual(UUID2h.toUpperCase());
    });
    test("return expression back when unknown wanted field", async () => {
        expect(refService.resolveReference(`{REF:Z@I:${UUID2h}}`, entry, entries)).toEqual(`{REF:Z@I:${UUID2h}}`);
    });
    test("return expression back when unmatched text", async () => {
        expect(refService.resolveReference("{REF:Z@I:33333333333333}", entry, entries)).toEqual("{REF:Z@I:33333333333333}");
    });

    test("search in title", async () => {
        expect(refService.resolveReference("{REF:I@T:" + entry2.fields.Title + "}", entry, entries)).toEqual(UUID2h.toUpperCase());
    });
    test("search in user name", async () => {
        expect(refService.resolveReference("{REF:I@U:" + entry2.fields.UserName + "}", entry, entries)).toEqual(UUID2h.toUpperCase());
    });
    test("search in password using ProtectedValue only", async () => {
        expect(refService.resolveReference("{REF:I@P:" + entry2.fields.Password + "}", entry, entries)).toEqual(UUID2h.toUpperCase());
    });
    test("search in url", async () => {
        expect(refService.resolveReference("{REF:I@A:" + entry2.fields.URL + "}", entry, entries)).toEqual(UUID2h.toUpperCase());
    });
    test("search in notes", async () => {
        expect(refService.resolveReference("{REF:I@N:" + entry2.fields.Notes + "}", entry, entries)).toEqual(UUID2h.toUpperCase());
    });
    test("search in id", async () => {
        expect(refService.resolveReference("{REF:I@I:" + UUID2h + "}", entry, entries)).toEqual(UUID2h.toUpperCase());
    });
    test("return expression back when unknown search field", async () => {
        expect(refService.resolveReference("{REF:I@Z:2}", entry, entries)).toEqual("{REF:I@Z:2}");
    });
    test("return expression back when unknown search and wanted field", async () => {
        expect(refService.resolveReference("{REF:I@I:3333}", entry, entries)).toEqual("{REF:I@I:3333}");
    });

    test("search in custom strings", async () => {
        expect(refService.resolveReference("{REF:I@O:" + entry2.fields.emailAddress + "}", entry, entries)).toEqual(UUID2h.toUpperCase());
    });

    // https://github.com/facebook/jest/issues/7780 triggers when kdbxweb decoded to UTF8 so this test can't pass until jest is fixed
    // test("resolve recursive wanted password to unprotected text", async () => {
    //     expect(refService.processAllReferences(3, `{REF:P@I:${UUID4h}}`, entry, entries)).toEqual("Some password2");
    // });
});

describe("checking if field has references", () => {
    test("return true if has simple reference", async () => {
        expect(refService.hasReferences("{REF:I@O:something}")).toEqual(true);
    });
    test("return true if has embedded simple reference", async () => {
        expect(refService.hasReferences("something {TITLE} something")).toEqual(true);
    });
    test("return false if no reference", async () => {
        expect(refService.hasReferences("something something")).toEqual(false);
    });
});

describe("interpolating multiple references", () => {
    test("work with a simple reference", async () => {
        expect(refService.processAllReferences(3, "{TITLE}", entry, entries)).toEqual(entry.fields.Title);
    });
    test("work with a reference at the start", async () => {
        expect(refService.processAllReferences(3, "{TITLE} ", entry, entries)).toEqual(entry.fields.Title + " ");
    });
    test("work with a reference at the end", async () => {
        expect(refService.processAllReferences(3, " {TITLE}", entry, entries)).toEqual(" " + entry.fields.Title);
    });
    test("work with a reference in the middle", async () => {
        expect(refService.processAllReferences(3, " {TITLE} ", entry, entries)).toEqual(" " + entry.fields.Title + " ");
    });
    test("work with multiple references", async () => {
        expect(refService.processAllReferences(3, " {TITLE} {TITLE} ", entry, entries)).toEqual(" " + entry.fields.Title + " " + entry.fields.Title + " ");
    });
    test("work with multiple recursive references", async () => {
        expect(refService.processAllReferences(3, " {USERNAME} {PASSWORD} ", entry4, entries)).toEqual(" " + entry2.fields.UserName + " " + entry2.fields.Password.getText() + " ");
    });
    test("return the given text when there are no references", async () => {
        expect(refService.processAllReferences(3, "something", entry, entries)).toEqual("something");
    });
    test("return unrecognised expressions as-is", async () => {
        expect(refService.processAllReferences(3, " {TITLE} {nothing} ", entry, entries)).toEqual(" " + entry.fields.Title + " {nothing} ");
    });
});

describe("changing entry's UUID ourselves", () => {

    beforeEach(() => {
        createImmutableDatabase();
        refService2.changeUUID(chgEntry2, db2.getDefaultGroup(), UUID5);
    });

    test("only the UUID has changed", async () => {
        expect(chgEntry2.uuid.id).toEqual(UUID5.id);
        expect(chgEntry2.fields).toEqual({
            Title: "Sample Title2",
            UserName: "UserX2",
            URL: "http://keepass.info/2",
            Notes: "Some notes2",
            Password: ProtectedValue.fromString("Some password2"),
            emailAddress: "something2@keepass.info"
        });
    });

    test("resolve wanted title (UPPER)", async () => {
        expect(refService2.resolveReference(`{REF:T@I:${UUID5h.toUpperCase()}}`, chgEntry, chgEntries)).toEqual(chgEntry2.fields.Title);
    });
    test("resolve wanted title (lower)", async () => {
        expect(refService2.resolveReference(`{REF:T@I:${UUID5h}}`, chgEntry, chgEntries)).toEqual(chgEntry2.fields.Title);
    });
    test("resolve wanted title (mIXed)", async () => {
        const UUID5hMixed = UUID5h.replace(/([a-f])/, (a, x) => a.replace(x, x.toUpperCase()));
        expect(refService.resolveReference(`{REF:T@I:${UUID5hMixed}}`, chgEntry, chgEntries)).toEqual(chgEntry2.fields.Title);
    });
    test("resolve wanted username", async () => {
        expect(refService2.resolveReference(`{REF:U@I:${UUID5h}}`, chgEntry, chgEntries)).toEqual(chgEntry2.fields.UserName);
    });
    test("resolve wanted url", async () => {
        expect(refService2.resolveReference(`{REF:A@I:${UUID5h}}`, chgEntry, chgEntries)).toEqual(chgEntry2.fields.URL);
    });
    // https://github.com/facebook/jest/issues/7780 triggers when kdbxweb decoded to UTF8 so this test can't pass until jest is fixed
    // test("resolve wanted password to unprotected text", async () => {
    //     expect(refService2.resolveReference(`{REF:P@I:${UUID5h}}`, chgEntry, chgEntries)).toEqual("Some password2");
    // });
    test("resolve wanted notes", async () => {
        expect(refService2.resolveReference(`{REF:N@I:${UUID5h}}`, chgEntry, chgEntries)).toEqual(chgEntry2.fields.Notes);
    });
    test("resolve wanted id", async () => {
        expect(refService2.resolveReference(`{REF:I@I:${UUID5h}}`, chgEntry, chgEntries))
        .toEqual(ByteUtils.bytesToHex(chgEntry2.uuid.toBytes()).toUpperCase());
    });
    test("return expression back when unknown wanted field", async () => {
        expect(refService2.resolveReference(`{REF:Z@I:${UUID5h}}`, chgEntry, chgEntries)).toEqual(`{REF:Z@I:${UUID5h}}`);
    });
    test("return expression back when unknown wanted id", async () => {
        expect(refService2.resolveReference(`{REF:I@I:${UUID2h}}`, chgEntry, chgEntries)).toEqual(`{REF:I@I:${UUID2h}}`);
    });
    // https://github.com/facebook/jest/issues/7780 triggers when kdbxweb decoded to UTF8 so this test can't pass until jest is fixed
    // test("resolve recursive wanted password to unprotected text", async () => {
    //     expect(refService.processAllReferences(3, `{REF:P@I:${UUID4h}}`, entry, entries)).toEqual("Some password2");
    // });
});

describe("repairing externally changed UUID", () => {

    beforeEach(() => {
        createImmutableDatabase();
        chgEntry2.uuid = UUID5;
        refService2.repairUUID(db2.getDefaultGroup(), UUID5, UUID2);
    });


    test("only the UUID has changed", async () => {
        expect(chgEntry2.uuid.id).toEqual(UUID5.id);
        expect(chgEntry2.fields).toEqual({
            Title: "Sample Title2",
            UserName: "UserX2",
            URL: "http://keepass.info/2",
            Notes: "Some notes2",
            Password: ProtectedValue.fromString("Some password2"),
            emailAddress: "something2@keepass.info"
        });
    });

    test("resolve wanted title (UPPER)", async () => {
        expect(refService2.resolveReference(`{REF:T@I:${UUID5h.toUpperCase()}}`, chgEntry, chgEntries)).toEqual(chgEntry2.fields.Title);
    });
    test("resolve wanted title (lower)", async () => {
        expect(refService2.resolveReference(`{REF:T@I:${UUID5h}}`, chgEntry, chgEntries)).toEqual(chgEntry2.fields.Title);
    });
    test("resolve wanted title (mIXed)", async () => {
        const UUID5hMixed = UUID5h.replace(/([a-f])/, (a, x) => a.replace(x, x.toUpperCase()));
        expect(refService.resolveReference(`{REF:T@I:${UUID5hMixed}}`, chgEntry, chgEntries)).toEqual(chgEntry2.fields.Title);
    });
    test("resolve wanted username", async () => {
        expect(refService2.resolveReference(`{REF:U@I:${UUID5h}}`, chgEntry, chgEntries)).toEqual(chgEntry2.fields.UserName);
    });
    test("resolve wanted url", async () => {
        expect(refService2.resolveReference(`{REF:A@I:${UUID5h}}`, chgEntry, chgEntries)).toEqual(chgEntry2.fields.URL);
    });
    // https://github.com/facebook/jest/issues/7780 triggers when kdbxweb decoded to UTF8 so this test can't pass until jest is fixed
    // test("resolve wanted password to unprotected text", async () => {
    //     expect(refService2.resolveReference(`{REF:P@I:${UUID5h}}`, chgEntry, chgEntries)).toEqual("Some password2");
    // });
    test("resolve wanted notes", async () => {
        expect(refService2.resolveReference(`{REF:N@I:${UUID5h}}`, chgEntry, chgEntries)).toEqual(chgEntry2.fields.Notes);
    });
    test("resolve wanted id", async () => {
        expect(refService2.resolveReference(`{REF:I@I:${UUID5h}}`, chgEntry, chgEntries))
        .toEqual(ByteUtils.bytesToHex(chgEntry2.uuid.toBytes()).toUpperCase());
    });
    test("return expression back when unknown wanted field", async () => {
        expect(refService2.resolveReference(`{REF:Z@I:${UUID5h}}`, chgEntry, chgEntries)).toEqual(`{REF:Z@I:${UUID5h}}`);
    });
    test("return expression back when unknown wanted id", async () => {
        expect(refService2.resolveReference(`{REF:I@I:${UUID2h}}`, chgEntry, chgEntries)).toEqual(`{REF:I@I:${UUID2h}}`);
    });
    // https://github.com/facebook/jest/issues/7780 triggers when kdbxweb decoded to UTF8 so this test can't pass until jest is fixed
    // test("resolve recursive wanted password to unprotected text", async () => {
    //     expect(refService.processAllReferences(3, `{REF:P@I:${UUID4h}}`, entry, entries)).toEqual("Some password2");
    // });
});
