const url="https://main.irmaseal-pkg.ihub.ru.nl"

async function encrypt(readable, writable) {
    // Retrieve the public key from PKG API:
    const resp = await fetch(`${url}/v2/parameters`);
    const pk = await resp.json().then((r) => r.publicKey);

// Load the WASM module.
    const module = await import("@e4a/irmaseal-wasm-bindings");

// We provide the policies which we want to use for encryption.
    const policies = {
        recipient_1: {
            ts: Math.round(Date.now() / 1000),
            con: [
                {t: "pbdf.sidn-pbdf.email.email", v: "john.doe@example.com"},
                {t: "pbdf.gemeente.personalData.fullname", v: "John"},
            ],
        },
    };

// The following call reads data from a `ReadableStream` and seals it into `WritableStream`.
// Make sure that only chunks of type `Uint8Array` are enqueued to `readable`.
    await module.seal(pk, policies, readable, writable);
}

//Message handling
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
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

        const sealerWritable=new WritableStream();

        encrypt(sealerReadable, sealerWritable)
        sendResponse({ciphertext: "vbejivble"});

    }
);