import {encrypt, simpleEncodedReadableStream, simpleReadableStream, simpleWritableStream, cryptoInitialize} from "./crypto";
import {decrypt} from "./crypto";

console.log("ContentScript loaded")

let ciphertext, plaintext
let readableStream=simpleReadableStream("Test")
let writableStream=simpleWritableStream()
cryptoInitialize().then(
    ()=>{
        console.log("Crypto.js module initialized")
        encrypt(readableStream, writableStream.stream, "Alice").then(
            ()=>{
                ciphertext=writableStream.sink;
                console.log("Ciphertext: ", ciphertext)

            },
            ()=>console.log("Encryption failed")
        ),
            ()=>console.log("Initialization failed")
    }
    )



