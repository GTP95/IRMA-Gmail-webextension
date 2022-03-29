const url="https://main.irmaseal-pkg.ihub.ru.nl"
let module, mpk;    //Need those as global variables to have the initialize function initialize them and then use them in other functions

async function initialize(){
    // Load the WASM module.
    module = await import("@e4a/irmaseal-wasm-bindings")
    console.log(module)
// Retrieve the public key from PKG API:
    const resp = await fetch(`${url}/v2/parameters`);
    mpk = await resp.json().then((r) => r.publicKey);
    console.log("Using key: ", mpk)
}


async function encrypt(readable, writable, identifier) {
// We provide the policies which we want to use for encryption.
    const policies = {
        [identifier]: {
            ts: Math.round(Date.now() / 1000),
            con: [{ t: "irma-demo.gemeente.personalData.fullname", v: identifier }],
        },
    };
    console.log("Encrypting using policies: ", policies);

// The following call reads data from a `ReadableStream` and seals it into `WritableStream`.
// Make sure that only chunks of type `Uint8Array` are enqueued to `readable`.
    await module.seal(mpk, policies, readable, writable);
}

initialize().then(() => console.log("BackgroundScript initialized"));

//Message handling
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log(request)
        console.log(sender.tab ?
            "from a content script:" + sender.tab.url :
            "from the extension");

        const sealerReadable = new ReadableStream({
            start: (controller) => {
                const encoded = new TextEncoder().encode(request.plaintext);    //put inside the stream the plaintext grabbed form the contentScript
                controller.enqueue(encoded);
                controller.close();
            },
        });

        let output=new Uint8Array(0);
        const sealerWritable = new WritableStream({
            write: (chunk) => {
                output = new Uint8Array([...output, ...chunk]);
            },
        });

        encrypt(sealerReadable, sealerWritable, "Alice").then(
            () => {
            let responseObject={
                ciphertext: output,
                successful: true
                };
            console.log(responseObject);
            sendResponse(responseObject);
        },
            ()=>{
                  let responseObject= {
                      ciphertext: "NOT ENCRYPTED",
                      successful: false
                  }
                  console.log("Encryption failed")
                  sendResponse(responseObject)
            });
    return true;    //This makes the messaging system work, if this is removed, the object which is sent back to the ContentScript becomes undefined
    }

);
