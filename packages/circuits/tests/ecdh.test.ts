import { WitnessTester } from "circomkit"
import { deriveSecretScalar } from "@zk-kit/eddsa-poseidon"
import { beBufferToBigInt, crypto } from "@zk-kit/utils"
import { circomkit, genEcdhSharedKey, genPublicKey } from "./common"

describe("ECDH Shared Key derivation circuit", () => {
    let circuit: WitnessTester<["privateKey", "publicKey"], ["sharedKey"]>

    before(async () => {
        circuit = await circomkit.WitnessTester("ecdh", {
            file: "ecdh",
            template: "Ecdh"
        })
    })

    it("should correctly compute an ECDH shared key", async () => {
        const privateKey1 = crypto.getRandomValues(32)
        const privateKey2 = crypto.getRandomValues(32)
        const bgPrivateKey1 = beBufferToBigInt(Buffer.from(privateKey1))
        const bgPrivateKey2 = beBufferToBigInt(Buffer.from(privateKey2))

        const publicKey2 = genPublicKey(bgPrivateKey2)

        // generate a shared key between the first private key and the second public key
        const ecdhSharedKey = genEcdhSharedKey(bgPrivateKey1, publicKey2)

        const circuitInputs = {
            privateKey: BigInt(deriveSecretScalar(bgPrivateKey1)),
            publicKey: publicKey2
        }

        await circuit.expectPass(circuitInputs, { sharedKey: [ecdhSharedKey[0], ecdhSharedKey[1]] })
    })

    it("should generate the same shared key from the same keypairs", async () => {
        const privateKey1 = crypto.getRandomValues(32)
        const privateKey2 = crypto.getRandomValues(32)
        const bgPrivateKey1 = beBufferToBigInt(Buffer.from(privateKey1))
        const bgPrivateKey2 = beBufferToBigInt(Buffer.from(privateKey2))
        const publicKey1 = genPublicKey(bgPrivateKey1)
        const publicKey2 = genPublicKey(bgPrivateKey2)

        // generate a shared key between the first private key and the second public key
        const ecdhSharedKey = genEcdhSharedKey(bgPrivateKey1, publicKey2)
        const ecdhSharedKey2 = genEcdhSharedKey(bgPrivateKey2, publicKey1)

        const circuitInputs = {
            privateKey: BigInt(deriveSecretScalar(bgPrivateKey1)),
            publicKey: publicKey2
        }

        const circuitInputs2 = {
            privateKey: BigInt(deriveSecretScalar(bgPrivateKey2)),
            publicKey: publicKey1
        }

        // calculate first time witness and check contraints
        const witness = await circuit.calculateWitness(circuitInputs)
        await circuit.expectConstraintPass(witness)

        const out = await circuit.readWitnessSignals(witness, ["sharedKey"])
        await circuit.expectPass(circuitInputs, { sharedKey: ecdhSharedKey })
        await circuit.expectPass(circuitInputs2, { sharedKey: out.sharedKey })
        await circuit.expectPass(circuitInputs2, { sharedKey: ecdhSharedKey2 })
    })

    it("should generate the same ECDH key consistently for the same inputs", async () => {
        const privateKey1 = BigInt(deriveSecretScalar(Buffer.from(crypto.getRandomValues(32))))
        const privateKey2 = crypto.getRandomValues(32)
        const publicKey2 = genPublicKey(beBufferToBigInt(Buffer.from(privateKey2)))

        const circuitInputs = {
            privateKey: privateKey1,
            publicKey: publicKey2
        }

        // calculate first time witness and check contraints
        const witness = await circuit.calculateWitness(circuitInputs)
        await circuit.expectConstraintPass(witness)

        // read out
        const out = await circuit.readWitnessSignals(witness, ["sharedKey"])

        // calculate again
        await circuit.expectPass(circuitInputs, { sharedKey: out.sharedKey })
    })
})
