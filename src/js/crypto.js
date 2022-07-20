// @ts-check

import * as IrmaCore from '@privacybydesign/irma-core'
import { seal, Unsealer } from '@e4a/irmaseal-wasm-bindings'

const url = 'https://stable.irmaseal-pkg.ihub.ru.nl'
let irmasealModule, mpk // Need those as global variables to have the initialize function initialize them and then use them in other functions

async function initialize () {
  // Retrieve the public key from PKG API:
  const resp = await fetch(`${url}/v2/parameters`)
  mpk = await resp.json().then((r) => r.publicKey)
  console.log('Using key: ', mpk)
}

/**
 *
 * @param {Uint8Array} content
 * @returns {ReadableStream<any>}
 */
function createReadableStream (content) {
  console.log('Type: ', typeof content)
  return new ReadableStream({
    start: (controller) => {
      controller.enqueue(content)
      controller.close()
    }
  })
}

/**
 * Encrypt a ReadableStream into a WritableStream using IRMA
 * @param readable {ReadableStream}
 * @param writable {WritableStream}
 * @param identifiers {Array<String>}
 * @returns {Promise<void>}
 */
export async function encrypt (readable, writable, identifiers) {
  // We provide the policies which we want to use for encryption.
  const policies = identifiers.reduce((total, recipient) => {
    total[recipient] = {
      ts: Math.round(Date.now() / 1000), // Timestamp
      con: [{ t: 'pbdf.sidn-pbdf.email.email', v: recipient }]
    }
    return total
  }, {})
  console.log('Encrypting using policies: ', policies)

  // The following call reads data from a `ReadableStream` and seals it into `WritableStream`.
  // Make sure that only chunks of type `Uint8Array` are enqueued to `readable`.
  await seal(mpk, policies, readable, writable)
}

/**
 * Decrypt a ReadableStream into a WritableStream using IRMA
 * @param readable {ReadableStream}
 * @param writable {WritableStream}
 * @param usk {String}
 * @returns {Promise<void>} //It's just an empty promise... :D
 */
export async function decrypt (readable, writable, usk, identity) {
  try {
    console.log('Inside decrypt, ReadableStream: ', readable)
    const unsealer = await Unsealer.new(readable)
    // Unseal the contents of the IRMAseal packet, writing the plaintext to a `WritableStream`.
    console.log('Inside decrypt, identity: ', identity)
    console.log('Inside decrypt, usk: ', usk)
    console.log('Inside decrypt, WritableStream: ', writable)
    await unsealer.unseal(identity, usk, writable)
  } catch (error) {
    console.log(error)
  }
}

export async function getHiddenPolicies (ciphertext) {
  const unsealerReadable = createReadableStream(ciphertext)
  const unsealer = await Unsealer.new(unsealerReadable)
  const hidden = unsealer.get_hidden_policies()
  return hidden
}

initialize().then(() => console.log('Crypto module initialized'))
