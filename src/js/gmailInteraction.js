console.log("ContentScript loaded")
let ciphertext;

const encryptionPort = chrome.runtime.connect({name: "encryption"});    //create a port to handel message passing for encryption
encryptionPort.postMessage(
    {plaintext: "hello"}
);
encryptionPort.onMessage.addListener((response) => {    //handler for incoming messages
    if(response===undefined) console.log("Got called, but response is undefined...");
    else if(response.successful){
        ciphertext=response.ciphertext;
        console.log("ciphertext: ", ciphertext);
    }
    else if(!response.successful) console.log("Encryption failed");

    console.log("First message sent")
});

const decryptionPort = chrome.runtime.connect({name: "decryption"});
decryptionPort.postMessage(
    {ciphertext: ciphertext}
);
decryptionPort.onMessage.addListener(
    (response) =>{
        console.log("Decryption result received");
        if(response===undefined) console.log("Got called, but response is undefined...");
        else if(response.successful) console.log("plaintext: ", response.plaintext);
        else if(!response.successful) console.log("Decryption failed");
    }
)
