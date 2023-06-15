import appConfig from '../config/appConfig.json'

var mixin = {
  data() {
    return {
      usingFaucet: false,
    }
  },
  methods: {
    async encrypt(amount: number): Promise<string> {
      const encodedData = await this.$axios.get(`${appConfig.ENCRYPTION_SERVICE}/encrypt?number=${amount}`, {
        headers: { "content-type": "appliaction/json" }
      });

      if (encodedData.status !== 200) {
        throw new Error(`Failed to encrypt number from service: ${encodedData.status} ${encodedData.statusText}`)
      }

      return encodedData.data.encrypted
    },

    async decrypt(encryptedAmount: string): Promise<number> {
      const encodedData = await this.$axios.post(`${appConfig.ENCRYPTION_SERVICE}/decrypt`, {
        "encrypted": encryptedAmount
      },
      {
        headers: { "content-type": "appliaction/json" }
      });

      if (encodedData.status !== 200) {
        throw new Error(`Failed to encrypt number from service: ${encodedData.status} ${encodedData.statusText}`)
      }

      return Number(encodedData.data.decrypted)
    },

    async getCoins(address: string): Promise<string> {
      this.usingFaucet = true;
      try {
        const result = await this.$axios.get(`${appConfig.ENCRYPTION_SERVICE}/faucet/faucet?address=${address}`, {
          headers: { "content-type": "appliaction/json" }
        });
  
        if (result.status !== 200) {
          throw new Error(`Failed to get coins from faucet`)
        }
      } catch (err) {
        console.log(err);
      }
      this.usingFaucet = false;
      return "";
    }
  }
}
export default mixin;
