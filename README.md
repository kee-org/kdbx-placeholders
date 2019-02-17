Resolves placeholders within KDBX files

Inject custom placeholder configuration:

```
{
    examplePlugin: {
        isMatch: (text: string) => boolean;
        onMatch: (text: string, entry: KdbxEntry) => boolean; // return false to cancel invocation of replaceMatch
        replaceMatch: (text: string, entry: KdbxEntry) => string;
    }
}
```
