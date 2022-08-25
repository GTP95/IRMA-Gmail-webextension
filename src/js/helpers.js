/**
 * Message passing messes up with types (I get a "generic" object instead of an array) plus the UInt8Array.from() method
 * fails silently when I try to use it to convert the object back to an Uint8Array. So I have to use the following.
 * @param object {Object}
 * @returns {Uint8Array}
 */
export function objectToUInt8array(object) {
  return Uint8Array.from(Object.values(object));
}

/**
 * Converts an array to it's base64 representation.
 * Code adapted from https://tutorial.eyehunts.com/js/byte-array-to-base64-javascript-examples-code/
 * @param {Uint8Array} array
 * @returns {string}
 */
export function uint8ArrayToBase64(array) {
  let binary = "";
  const bytes = array;
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a base64-encoded string to it's UInt8Array equivalent
 * Adapted from here: https://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
 * @param base64
 * @returns {ArrayBufferLike}
 * @private
 */
function base64ToUInt8Array(base64) {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Takes a string representing an email's body as HTML and returns the content as a string.
 * Can't be used inside a service worker because uses the DOM API.
 * @param {string}emailBodyAsHTML A string representing the email's body as HTML
 * @returns {string} The email's body content
 */
export function extractEmailBodyFromHTML(emailBodyAsHTML) {
  const bodyAsHTML = document.createElement("html");
  bodyAsHTML.innerHTML = emailBodyAsHTML;
  return bodyAsHTML.innerText;
}

export function generateBody(userEmail) {
  const body =
    "You received a PostGuard encrypted email from " +
    userEmail +
    "\n" +
    "There are four ways to read this protected email:\n" +
    '1) If you use Outlook and have already installed PostGuard, click on the "Decrypt Email"-button. \n' +
    "This button can be found on the right side of the ribbon above.\n" +
    "2) You can decrypt and read this email via https://www.postguard.eu/decrypt/.\n" +
    "This website can only decrypt emails.\n" +
    "3) You can install the free PostGuard addon in your own mail client.\n" +
    "This works for Outlook and Thunderbird.\n" +
    "4) You can install the free postGuard extension in your own browser and use Gmail's webmail+\n" +
    "Download PostGuard via: https://www.postguard.eu\n" +
    "After installation, you can not only decrypt and read emails but also all future Postguarded emails. \n" +
    "Moreover, you can easily send and receive secure emails with the PostGuard addon within your email client.\n" +
    "\n" +
    "What is PostGuard?\n" +
    "\n" +
    "PostGuard is a service for secure emailing. Only the intended recipient(s) can decrypt\n" +
    "and read the emails sent with PostGuard. \n" +
    'The "Encryption for all"-team of the Radboud University has developed PostGuard.\n' +
    "PostGuard uses the IRMA app for authentication. \n" +
    "More information via: https://www.postguard.eu\n" +
    "\n" +
    "What is the IRMA app?\n" +
    "\n" +
    "When you receive a PostGuarded email, you need to use the IRMA app to prove that you\n" +
    "really are the intended recipient of the email.\n" +
    "IRMA is a separate privacy-friendly authentication app\n" +
    "(which is used also for other authentication purposes).\n" +
    "The free IRMA app can be downloaded via the App Store and Play Store.\n" +
    "More information via: https://irma.app";

  return body;
}

/**
 * The library I'm using to parse MIME messages messes up when the email contains an attachment. So I'm writing my own
 * parser for messages with attachments. The result is an object with the following two fields:
 * body: a string containing the email's body
 * attachments: a list of uint8Arrays representing the attachments.
 * @param {String}mailAsString
 * @returns {Object}
 */
export function parseMIMEmailWithAttachments(mailAsString) {
  //extract the boundary string from the header
  const splittedMessageArray = mailAsString.split("boundary=");
  console.log("splittedMessageArray: ", splittedMessageArray);
  const splitAgain = splittedMessageArray[1].split("\n");
  console.log("splitAgain", splitAgain);
  const boundary = splitAgain[0];
  console.log("Boundary: ", boundary);
  const messagePartsArray = mailAsString.split("--" + boundary);
  console.log("Message parts: ", messagePartsArray);

  //Now to get the body I need to split around two empty lines
  const body = messagePartsArray[1].split("\n\n")[1]; //TODO: to account for possible double line breaks inside the message, I should remove first and last element of the array and gluing together the other elements adding \n\n between them
  console.log("Body: ", body);

  //And now let's get the attachments. Assuming only one attachment for now. TODO: generalize

  let result = {};
  result.body = body;
  return result;
}
