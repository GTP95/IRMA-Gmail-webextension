chrome.runtime.sendMessage({plaintext: "hello"}, function(response) {
    console.log(response.ciphertext);
});