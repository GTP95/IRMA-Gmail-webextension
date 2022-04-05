console.log("ContentScript loaded")

var port = chrome.runtime.connect({name: "crypto"});
port.postMessage(
    {
        content: "Knock knock",
        request: "encrypt"
    }
    );
port.onMessage.addListener(function(msg) {
    console.log(msg)
    switch (msg.type){
        case "ciphertext":
            port.postMessage(
                {
                content: msg.content,
                    request: "decrypt"
            }
            )
            break
        case "plaintext":
            console.log("Messaging works!")
            break
        case "error":
            console.log("Something went wrong, inspect message for clues")
            break
        default: console.log("Generic messaging error, probably a typo in msg.type?")
    }
});
