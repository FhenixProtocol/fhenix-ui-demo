import appConfig from "../config/appConfig.json";
import { ethers, Web3Provider } from "ethers";
import _sodium from "libsodium-wrappers";

const fromHexString = (hexString: string): Uint8Array => {
  const arr = hexString.replace(/^(0x)/, '').match(/.{1,2}/g);
  if (!arr) return new Uint8Array();
  return Uint8Array.from(arr.map((byte) => parseInt(byte, 16)));
};

var mixin = {
  created() {
    var self = this;
    const load = async () => {
      await _sodium.ready;
      self.sodium = _sodium;
      self.FHEKeypair = self.sodium.crypto_box_keypair("hex");
      self.FHEPublicKey = self.FHEKeypair.publicKey;
    }
    load();
  },
  data() {
    return {
      usingFaucet: false,
      sodium: null,
      FHEKeypair: null,
      FHEPublicKey: null
    };
  },
  methods: {
    async encrypt(amount: number): Promise<string> {
      try {
        const encodedData = await this.$axios.get(
          `${appConfig.ENCRYPTION_SERVICE}/encrypt?number=${amount}`,
          {
            headers: { "content-type": "appliaction/json" },
          }
        );
        if (encodedData.status !== 200) {
          throw new Error(
            `Failed to encrypt number from service: ${encodedData.status} ${encodedData.statusText}`
          );
        }
        return encodedData.data.encrypted;
      }
      catch (err) {
        console.log(err);
      }
      return "";

    },

    async decryptOld(encryptedAmount: string): Promise<number> {
      const encodedData = await this.$axios.post(
        `${appConfig.ENCRYPTION_SERVICE}/decrypt`,
        {
          encrypted: encryptedAmount,
        },
        {
          headers: { "content-type": "appliaction/json" },
        }
      );

      if (encodedData.status !== 200) {
        throw new Error(
          `Failed to encrypt number from service: ${encodedData.status} ${encodedData.statusText}`
        );
      }

      return Number(encodedData.data.decrypted);
    },

    async loadSignature(provider: Web3Provider) {
      const savedData = window.localStorage.getItem('savedData');
      JSON.stringify(self.FHEKeypair)
      if (savedData) {
        const o = JSON.parse(savedData);
        this.FHEKeypair = o.keypair;
        this.FHEPublicKey = o.keypair.publicKey
        return o.msgSig;
      }

      console.log("Generating keys...");
      const contractAddress = appConfig.ENC_ERC20_CONTRACT;

      const signer = await provider.getSigner();

      const domain = {
        name: "Authorization token",
        version: "1",
        chainId: 9000,
        verifyingContract: contractAddress,
      };

      const typedData = {
        types: {
          Reencrypt: [
            {
              name: "publicKey",
              type: "bytes32",
            },
          ],
        },
        domain: domain,
        primaryType: "Reencrypt",
        message: {
          publicKey: `0x${this.FHEPublicKey}`,
        },
      };

      const msgSig = await signer._signTypedData(
        typedData.domain,
        typedData.types,
        typedData.message
      );

      const dataToSave = {
        keypair: this.FHEKeypair,
        msgSig
      }
      window.localStorage.setItem('savedData', JSON.stringify(dataToSave));
      return msgSig;
    },

    async decrypt(amount: string) {
      const plaintext = this.sodium.crypto_box_seal_open(
        fromHexString(amount),
        fromHexString(this.FHEKeypair.publicKey),
        fromHexString(this.FHEKeypair.privateKey)
      );

      console.log("enc balance:", plaintext);

      if (plaintext === false) {
        return 0;
      }
      return ethers.BigNumber.from(plaintext).toNumber();
    },

    async getFHETokenBalance(provider: Web3Provider) {
      try {
        let sig = await this.loadSignature(provider);
        let encResult = await this.activeContract.balanceOf(`0x${this.FHEPublicKey}`, sig);
        this.info = "Decrypting balance..."
        
        let balance = await this.decrypt(encResult);
        return balance;
      } catch (err) {
        console.log(err);
      }
      return 0;
    }, 

    async getCoins(address: string): Promise<string> {
      try {
        const result = await this.$axios.get(
          `${appConfig.ENCRYPTION_SERVICE}/faucet/faucet?address=${address}`,
          {
            headers: { "content-type": "appliaction/json" },
          }
        );

        if (result.status !== 200) {
          throw new Error(`Failed to get coins from faucet`);
        }
      } catch (err) {
        console.log(err);
      }
      return "";
    },
  },
};
export default mixin;
