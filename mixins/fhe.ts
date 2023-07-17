import appConfig from "../config/appConfig.json";
import { ethers, Web3Provider } from "ethers";
import { initFhevm, createInstance } from "fhevmjs";

const fromHexString = (hexString: string): Uint8Array => {
  const arr = hexString.replace(/^(0x)/, '').match(/.{1,2}/g);
  if (!arr) return new Uint8Array();
  return Uint8Array.from(arr.map((byte) => parseInt(byte, 16)));
};

var mixin = {
  created() {

  },
  data() {
    return {
      usingFaucet: false,
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

    async createFhevmInstance(provider: Web3Provider, savedData: any) {
      await initFhevm();
      const publicKey = await provider.call({
        from: null,
        to: "0x0000000000000000000000000000000000000044",
      });

      return createInstance({ chainId: appConfig.CHAIN_ID, publicKey , keypairs: (savedData) ? savedData.keypairs : undefined });
    }, 

    async loadSignature(provider: Web3Provider, address: string) {
      const savedData = window.localStorage.getItem(`savedFHEVMData_${appConfig.CHAIN_ID}_${address}`);
      var o = null;
      if (savedData) {
        o = JSON.parse(savedData);
      }

      if (o) {
        if (!this.instance) {
          this.instance = await this.createFhevmInstance(provider, o);
        }
        return { msgSig: o.msgSig, publicKey: o.publicKey };
      }
      
      if (!this.instance) {
        this.instance = await this.createFhevmInstance(provider, null);
      }

      const signer = await provider.getSigner();
      const generatedToken = this.instance.generateToken({
        verifyingContract: appConfig.ENC_ERC20_CONTRACT,
      });
      

      const msgSig = await signer._signTypedData(
        generatedToken.token.domain,
        { Reencrypt: generatedToken.token.types.Reencrypt },
        generatedToken.token.message
      );

      this.instance.setTokenSignature(appConfig.ENC_ERC20_CONTRACT, msgSig);
      const keypairs = this.instance.serializeKeypairs();
      const dataToSave = {
        keypairs,
        publicKey: keypairs[appConfig.ENC_ERC20_CONTRACT].publicKey,
        msgSig
      }

      console.log(dataToSave);
      window.localStorage.setItem(`savedFHEVMData_${appConfig.CHAIN_ID}_${address}`, JSON.stringify(dataToSave));
      return { msgSig, publicKey: keypairs[appConfig.ENC_ERC20_CONTRACT].publicKey };
    },

    async getFHETokenBalance(provider: Web3Provider, address: string) {
      try {
        let sig = await this.loadSignature(provider, address);
        this.instance.setTokenSignature(appConfig.ENC_ERC20_CONTRACT, sig.msgSig);

        const encryptedBalance = await this.activeContract.balanceOf(`0x${sig.publicKey}`, sig.msgSig);
        const balance = this.instance.decrypt(appConfig.ENC_ERC20_CONTRACT, encryptedBalance);
        return balance;
      } catch (err) {
        console.log(err);
      }
      return 0;
    }, 

    async getCoins(address: string): Promise<string> {
      try {
        const result = await this.$axios.get(
          `${appConfig.ENCRYPTION_SERVICE}/faucet?address=${address}`,
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
