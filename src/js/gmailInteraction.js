console.log("ContentScript loaded")
let cipherText;

const cryptoPort = chrome.runtime.connect({name: "cryptoPort"});    //create a port to handel message passing for encryption

cryptoPort.onDisconnect.addListener(()=>console.log("PORT CLOSED!!!"))
cryptoPort.onMessage.addListener((response) => {    //handler for incoming messages
    if(response===undefined) console.log("Got called, but response is undefined...");
    switch (response.content){

        case "ciphertext":
            if(response.successful){
                cipherText=response.ciphertext
                console.log("ciphertext: ", cipherText)
            }
            else console.log("Encryption failed")
            break;

        case "plaintext":
            if(response.successful){
                console.log("Decryption successful")
            }
            else console.log("Decryption failed")
            break
    }

});

cryptoPort.postMessage(
    {
        ciphertext: cipherText,
        request: "decrypt"
    }
)

cryptoPort.postMessage(
    {
        plaintext: "hello",
        request: "encrypt"
    }
);

