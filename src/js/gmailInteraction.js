console.log("ContentScript loaded")
chrome.runtime.sendMessage({plaintext: "hello"}, (response) => {
    if(response===undefined) console.log("Got called, but response is undefined...");
    else if(response.successful===true) console.log(response.ciphertext);
    else if(response.successful===false) console.log("Encryption failed");

});