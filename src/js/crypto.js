import * as IrmaCore from "@privacybydesign/irma-core";
import * as IrmaClient from "@privacybydesign/irma-client";
import * as IrmaPopup from "@privacybydesign/irma-popup";
import "@privacybydesign/irma-css";


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


export async function encrypt(readable, writable, identifier) {
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

export async function decrypt(readable, writable, identifier){
    const guess = {
          con: [{ t: "irma-demo.gemeente.personalData.fullname", v: identifier }],
        };

    try {
        const unsealer = await mod.Unsealer.new(unsealerReadable);
        const hidden = unsealer.get_hidden_policies();
        console.log("hidden policy: ", hidden);

        // Guess it right, order should not matter
        const guess = {
            con: [{ t: "irma-demo.gemeente.personalData.fullname", v: identifier }],
        };
    }
    catch (e){
        console.log(e);
    }
        const session = {
            url,
            start: {
                url: (o) => `${o.url}/v2/request/start`,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(keyRequest),
            },
            result: {
                url: (o, { sessionToken }) => `${o.url}/v2/request/jwt/${sessionToken}`,
                parseResponse: (r) => {
                    return r
                        .text()
                        .then((jwt) =>
                            fetch(`${pkg}/v2/request/key/${timestamp.toString()}`, {
                                headers: {
                                    Authorization: `Bearer ${jwt}`,
                                },
                            })
                        )
                        .then((r) => r.json())
                        .then((json) => {
                            if (json.status !== "DONE" || json.proofStatus !== "VALID")
                                throw new Error("not done and valid");
                            return json.key;
                        })
                        .catch((e) => console.log("error: ", e));
                },
            },
        };
    var irma = new IrmaCore({ debugging: true, session });
    irma.use(IrmaClient);
    irma.use(IrmaPopup);
    const usk = await irma.start();

// Unseal the contents of the IRMAseal packet, writing the plaintext to a `WritableStream`.
    await unsealer.unseal("recipient_1", usk, writable);

    }

initialize().then(() => console.log("Crypto module initialized"));