// @ts-check

import * as IrmaCore from "@privacybydesign/irma-core";
import * as IrmaClient from "@privacybydesign/irma-client";
import * as IrmaPopup from "@privacybydesign/irma-popup";
import "@privacybydesign/irma-css";
import "gmail-js";
import { createMimeMessage } from "mimetext";
import {
  objectToUInt8array,
  extractEmailBodyFromHTML,
  generateBody,
  uint8ArrayToBase64,
} from "./helpers";

console.log("ContentScript loaded");

const extensionID = "hmjfmafnafhppnngfnkjccjdjgnannea";
const subject = "PostGuard encrypted email";
const pkg = "https://main.irmaseal-pkg.ihub.ru.nl";

/**
 * Wraps up the steps needed
 * @param extensionID
 * @param message
 * @param identity
 * @param callback
 */
function requestDecryption(extensionID, message, identity, callback) {
  // First we need to get the hidden policies. Why they play hide-and-seek, is still debated
  chrome.runtime.sendMessage(
    extensionID,
    {
      content: message,
      request: "hidden policies",
    },
    async (response) => {
      if (response == undefined) {
        console.error(
          "Something went wrong in receiving the hidden policies from the service worker, maybe a problem with message passing?"
        );
        return;
      }
      const hidden = response.content;
      const keyRequest = {
        con: [{ t: "pbdf.sidn-pbdf.email.email", v: identity }],
        validity: 600, // 1 minute
      };
      const timestamp = hidden[identity].ts;
      const session = {
        url: pkg,
        start: {
          url: (o) => `${o.url}/v2/request/start`,
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          url: (o, { sessionToken }) =>
            `${o.url}/v2/request/jwt/${sessionToken}`,
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
                if (json.status !== "DONE" || json.proofStatus !== "VALID") {
                  throw new Error("not done and valid");
                }
                return json.key;
              })
              .catch((e) => console.log("error: ", e));
          },
        },
      };

      const irma = new IrmaCore({ debugging: true, session }); // TODO: ask if it's better to switch to false

      irma.use(IrmaClient);
      irma.use(IrmaPopup);

      const usk = await irma.start();
      console.log("retrieved usk: ", usk);

      // Now that we've got the key (the one that was in the mausoleum...) we can go on and decrypt the message
      chrome.runtime.sendMessage(
        extensionID,
        {
          request: "decrypt",
          content: message,
          usk,
          identity,
        },
        callback
      );
    }
  );
}

/**
 * Returns true if attachment has the name "postguard.encrypted".
 * Unfortunately I can't use the MIME type to detect PostGuard attachments, as Gmail changes it to "application/octet-stream"
 * @param attachment
 * @returns {boolean}
 */
function isPostguardAttachment(attachment) {
  return attachment.name.toLowerCase() === "postguard.encrypted";
}

// loader-code: wait until gmail.js has finished loading, before triggering actual extension-code.
const loaderId = setInterval(() => {
  // @ts-ignore
  if (!window._gmailjs) {
    return;
  }

  clearInterval(loaderId);
  // @ts-ignore
  startExtension(window._gmailjs);
}, 100);

// actual extension-code
function startExtension(gmail) {
  console.log("Extension loading...");
  // @ts-ignore
  window.gmail = gmail;

  gmail.observe.on("load", () => {
    const userEmail = gmail.get.user_email();
    console.log("Hello, " + userEmail + ". This is your extension talking!");

    /* VIEWING AN EMAIL */

    gmail.observe.on("view_email", (domEmail) => {
      console.log("Looking at email:", domEmail);
      const emailData = gmail.new.get.email_data(domEmail);
      console.log("Email data:", emailData);

      const attachments = emailData.attachments;
      for (const attachment in attachments) {
        console.log("Processing attachment: ", attachments[attachment]); // I was expecting "attachment" to contain the object representing the attachment. It contains the index instead.
        // If the email contains PostGuard attachments, retrieve and decrypt them
        if (isPostguardAttachment(attachments[attachment])) {
          gmail.tools
            .make_request_download_promise(attachments[attachment].url, true)
            .then((postGuardMessage) =>
              requestDecryption(
                extensionID,
                postGuardMessage,
                userEmail,
                (response) => {
                  if (response == undefined) {
                    console.error(
                      "Got an undefined response from service worker instead of the plaintext, maybe a problem " +
                        "with message passing?"
                    );
                    return;
                  }
                  const parsedEmailObject = response.plaintext;
                  console.log("Response object: ", response);
                  console.log("Parsed email object: ", parsedEmailObject);
                  const subject = parsedEmailObject.headers.subject[0].value;
                  console.log("Subject: ", subject);

                  console.log("Email's content: ", parsedEmailObject.content);
                  if (parsedEmailObject.content != null) {
                    //Extract email's body only if it actually exists

                    const bodyAsHTML = new TextDecoder().decode(
                      objectToUInt8array(parsedEmailObject.content)
                    );
                    console.log("HTML body: ", bodyAsHTML); // TODO: what if email isn't in HTML format? How do I detect this? Probably it is enough to inspect the 'contentType' parameter
                    const bodyAsText = extractEmailBodyFromHTML(bodyAsHTML);
                    console.log("Body: ", bodyAsText);
                    domEmail.body(bodyAsText);
                  } else domEmail.body(" "); //Set an empty body if the original email doesn't have one. Cosmetic functionality to remove the instructions about how to decrypt
                  //set email's subject
                  const subjectNode = gmail.dom.email_subject();
                  subjectNode.text(subject);
                }
              )
            );
        }
      }
    });

    /* COMPOSING AN EMAIL */

    gmail.observe.on("compose", (compose) => {
      console.log("New compose window is opened!", compose);
      // adding button, finally:
      const compose_ref = gmail.dom.composes()[0];
      gmail.tools.add_compose_button(
        compose_ref,
        "PostGuard",
        async function () {
          const emailRecipients = compose_ref.recipients(); // I'm not getting how to specify options, working with this for now
          const recipientsArray = [];
          for (const recipient of emailRecipients.to) {
            recipientsArray.push(recipient);
          }
          for (const recipient of emailRecipients.cc) {
            recipientsArray.push(recipient);
          }
          for (const recipient of emailRecipients.bcc) {
            recipientsArray.push(recipient);
          }

          // And now extract the email address from each string (at this point those are in the format "name <email.addrss@domain.com>", but only if they already are in the address book! That's why I need an if later to check the format)
          const recipientsAddressesArray = [];
          let splittedArray;
          for (const recipient of recipientsArray) {
            if (recipient.includes("<") && recipient.includes(">")) {
              // Dirty hack to detect the address' format, see previous comment    TODO: this could be probably made better by looking for a method that properly extracts the email address or trying with a regex
              splittedArray = recipient.split(new RegExp("[<>]"));
              recipientsAddressesArray.push(splittedArray[1]);
            } else recipientsAddressesArray.push(recipient); // If the condition is false, the email address is already in the correct form. All of this assuming nobody has bot '<' and '>' in their address...
          }
          console.log("Email addresses: ", recipientsAddressesArray);

          const emailBody = compose_ref.body();
          const emailSubject = compose_ref.subject();
          const emailAttachmentsInfo = compose_ref.attachments();
          console.log("Recipients: ", recipientsArray);
          console.log("Attachments: ", emailAttachmentsInfo);

          // create a mime object representing the email
          const msg = createMimeMessage();

          msg.setSender(userEmail); // I have to duplicate some information for compatibility with the other addons
          // @ts-ignore
          msg.setRecipients(recipientsAddressesArray);
          msg.setSubject(emailSubject);
          msg.setMessage("text/plain", emailBody); // Maybe also works without specifying the type, but body() returns a string anyway

          // Let's grab all the attachments
          const attachmentsData = [];
          for (const attachmentInfo of emailAttachmentsInfo) {
            const attachmentData =
              await gmail.tools.make_request_download_promise(
                attachmentInfo.url,
                true
              );
            attachmentsData.push(attachmentData);
          }

          console.log("List of attachments data: ", attachmentsData);

          // And add them to the email
          for (const attachment of attachmentsData) {
            console.log("attachment: ", attachment);
            console.log("Reported type of attachment: ", typeof attachment);

            msg.setAttachment(
              "Encrypted attachment",
              `text/plain`,
              uint8ArrayToBase64(attachment)
            ); //For the attachment's type I can only use text/html or text/plain
          }

          console.log(
            "Sending this to the service worker for encryption: ",
            msg.asRaw()
          );

          // Now send this constructed message to the service worker for encryption
          chrome.runtime.sendMessage(
            extensionID,
            {
              content: msg.asRaw(),
              identifiers: recipientsAddressesArray,
              request: "encrypt",
            },
            (response) => {
              const encryptedEmail = response.ciphertext;
              console.log(
                "Encrypted email (as received from the service worker): ",
                encryptedEmail
              );

              const byteDataToSend = objectToUInt8array(encryptedEmail);
              console.log("Byte data that will be sent: ", byteDataToSend);

              // Replace subject and body of the email with text explaining this is an IRMA encrypted email
              const body = generateBody(userEmail);

              compose_ref.subject(subject);
              compose_ref.body(body);

              // And finally the fun part: try to add this as an attachment. For this, I use the hack suggested here: https://github.com/KartikTalwar/gmail.js/issues/635#issuecomment-808770417

              const fileInput = compose.$el.find("[type=file]")[0];
              console.log("Files:", fileInput.files);
              const file = new File([byteDataToSend], "postguard.encrypted", {
                type: "application/postguard",
              });
              const dt = new DataTransfer();
              dt.items.add(file);
              fileInput.files = dt.files;
              const evt = document.createEvent("HTMLEvents");
              evt.initEvent("change", false, true);
              fileInput.dispatchEvent(evt);

              // Last thing: automatically send the email once everything is done
              compose_ref.send();
            }
          );
        },
        "Custom Style Classes"
      );
    });
  });
}
