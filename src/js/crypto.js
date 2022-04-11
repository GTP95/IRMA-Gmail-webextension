import * as IrmaCore from "@privacybydesign/irma-core";
import * as IrmaClient from "@privacybydesign/irma-client";
import * as IrmaPopup from "@privacybydesign/irma-popup";
import "@privacybydesign/irma-css";


const url = "https://main.irmaseal-pkg.ihub.ru.nl"
let module, mpk;    //Need those as global variables to have the initialize function initialize them and then use them in other functions
const pkg = url //lol Bruschi eas right, no copy&paste...

export async function cryptoInitialize() {
    // Load the WASM module.
    module = await import("@e4a/irmaseal-wasm-bindings").then(
        ()=>console.log(module),
        ()=>console.log("Failed loading module @e4a/irmaseal-wasm-bindings")
    )

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
            con: [{t: "irma-demo.gemeente.personalData.fullname", v: identifier}],
        },
    };
    console.log("Encrypting using policies: ", policies);

// The following call reads data from a `ReadableStream` and seals it into `WritableStream`.
// Make sure that only chunks of type `Uint8Array` are enqueued to `readable`.
    await module.seal(mpk, policies, readable, writable);
}

export async function decrypt(readable, writable, identifier) {
    try {
        const unsealer = await module.Unsealer.new(readable);
        const hidden = unsealer.get_hidden_policies();
        console.log("hidden policy: ", hidden);

        const keyRequest = {
            con: [{t: "irma-demo.gemeente.personalData.fullname", v: identifier}],
            validity: 600, // 1 minute
        };

        const timestamp = hidden[identifier].ts;

        const session = {
            url: pkg,
            start: {
                url: (o) => `${o.url}/v2/request/start`,
                method: "POSTF",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(keyRequest),
            },
            mapping: {
                // temporary fix
                sessionPtr: (r) => {
                    const ptr = r.sessionPtr;
                    ptr.u = `https://ihub.ru.nl/irma/1/${ptr.u}`;
                    return ptr;
                },
            },
            result: {
                url: (o, {sessionToken}) => `${o.url}/v2/request/jwt/${sessionToken}`,
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

        const irma = new IrmaCore({debugging: true, session});

        irma.use(IrmaClient);
        irma.use(IrmaPopup);

        const usk = await irma.start();
        console.log("retrieved usk: ", usk);

        const t0 = performance.now();

        await unsealer.unseal(identifier, usk, writable);

        const tDecrypt = performance.now() - t0;

        console.log(`tDecrypt ${tDecrypt}$ ms`);
    } catch (e) {
        console.log("error during unsealing: ", e);
    }


}

export function simpleReadableStream(unencodedData){
    const readableStream = new ReadableStream({
        start: (controller) => {
            const encoded = new TextEncoder().encode(unencodedData);
            controller.enqueue(encoded);
            controller.close();
        },
    });

    return readableStream
}

export function simpleEncodedReadableStream(encodedData){
    const readableStream = new ReadableStream({
        start: (controller) => {
            controller.enqueue(encodedData);
            controller.close();
        },
    });

    return readableStream
}

export function simpleWritableStream(){
    let sink = new Uint8Array(0);
    const writableStream = new WritableStream({
        write: (chunk) => {
            sink = new Uint8Array([...sink, ...chunk]);
        },
    });
    return {
        "sink": sink,
        "stream": writableStream
    }
}

