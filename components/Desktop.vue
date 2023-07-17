
<script lang="ts">

import FHEMixin from '../mixins/fhe';
import mainMixin from '../mixins/mainMixin';
import { useTheme } from 'vuetify'


export default {
  mixins: [mainMixin, FHEMixin],
  setup () {
    const theme = useTheme();
    return {
      theme,
      toggleTheme: () => {
        return theme.global.name.value = theme.global.name.value === 'nonEncryptedTheme' ? 'encryptedTheme' : 'nonEncryptedTheme';
      } 
    }
  },
  created() {

  },
  data() {
    return {
      qrInfo: {
        expanded: false,
        size: "50px",
        radius: "5px",
        padding: "5px",
        componentSize: 50
      }
    }
  },
  methods: {
    toggleQR() {
      if (this.qrInfo.expanded) {
        this.qrInfo = {
          expanded: false,
          size: "50px",
          radius: "5px",
          padding: "5px",
          componentSize: 50
        };
      } else {
        this.qrInfo = {
          expanded: true,
          size: "300px",
          radius: "20px",
          padding: "20px",
          componentSize: 300
        };
      }
    }
  }, 
  computed: {
    infoBoxAnimatedStyle() {
      let bgColor = "rgba(10, 10, 10, 0.4)";
      let infoHeight = "35px";

      if (this.info !== "") {
        infoHeight = "35px";
        if (this.info.indexOf("Error:") !== -1) {
          bgColor = "rgba(200, 100, 100, 0.6)";
        }        
      }
      return { "--info-height" : infoHeight, "--bg-color": bgColor };
    },
    qrStyle() {
      return { "--qr-size": this.qrInfo.size, "--qr-radius": this.qrInfo.radius, "--qr-padding": this.qrInfo.padding };
    }
  }
}
</script>

<template>
  <div class="main">
    <div class="settings-panel">
      <div id="logo" style="position: absolute; padding: 10px; left:3px; height: 100px; width: 320px">
        <img class="logo" src="~/assets/fhenix_logo.svg" />
      </div>
      
      <div style="height: 120px;"></div> <!-- spacer -->
      
      <v-btn class="btn connect-wallet" :class="isConnected ? 'connected-wallet' : 'connect-wallet-animate'" color="#FC4A1A" rounded @click="connect">
        <template v-slot:prepend>
          <div style="height: 24px; width: 24px"><img src="~/assets/metamask.logo.svg" /></div>
        </template>
        {{ isConnected ? "Connected" : "Connect Wallet" }}
      </v-btn>

      <div style="height: 30px;"></div> <!-- spacer -->

      <div v-if="isConnected" class="account-info">
        <div>Account: <span style="font-family: monospace">{{ shortAddress(account) }}</span></div>
        <div style="margin-bottom: 0px;">Balance: <span style="font-family: monospace; color: #FC4A1A; font-weight: bold">{{  walletBalanceChecking ? "refreshing..." :  walletBalance.toFixed() }}</span> <span v-if="!walletBalanceChecking" style="font-family: monospace">FHE</span></div>
        <v-btn class="btn" :class="showLowTokenWarning && !(usingFaucet || walletBalanceChecking) ? 'button-focus-animation' : ''" :loading="usingFaucet || walletBalanceChecking" color="#FC4A1A" rounded @click="rquestCoinsFromFaucet()" :disabled="account === '' || usingFaucet || walletBalanceChecking || walletBalance > 50" style="margin-top: 10px">
          <template v-slot:default>
            <!-- <v-tooltip activator="parent" location="bottom">Get coins from the faucet if you to allow execute transactions</v-tooltip> -->
            Get coins
          </template>
        </v-btn>
        <div v-if="showLowTokenWarning" style="font-size: 11px">You need more coins to make transactions</div>

      </div>
        
    </div>
    <div class="content-panel">
      <div v-if="!isConnected" class="content-blocker">
      </div>
      <div>
        <div class="action-panel" :class="enableEncryption ? 'encrypted' : 'non-encrypted'">
          
          <div v-if="showEncryptionInfo" style="position: absolute; top: 55px; right: -50px; z-index: 20">
            <div class="triangle-tooltip">
            <div> 
              <table>
                <tr> 
                  <td style="white-space: nowrap; vertical-align:top"><span style="color: red">Off</span>&nbsp;-&nbsp;&nbsp;</td>
                  <td>Standard ERC20 contract</td>
                </tr>
                <tr><td colspan="2" style="font-size: 2px">&nbsp;</td></tr>
                <tr> 
                  <td style="white-space: nowrap; vertical-align:top"><span style="color: green">On</span>&nbsp;-&nbsp;&nbsp;</td>
                  <td>Modified ERC20 contract with FHE encryption enabled</td>
                </tr>
                <tr><td colspan="2" style="padding-top: 10px; text-align: right">
                  <v-btn density="compact" rounded color="primary" @click="gotIt">Got it!</v-btn>
                </td></tr>
                
              </table>
              
            </div>
            <span class="triangle"></span>
            </div>
          </div>

          <div style="font-size: 24px; display: flex; align-items: center; gap: 10px">
            <b>Contract:</b> <span style="font-family: monospace">{{ shortAddress(contractAddress) }}</span> 
            <v-btn color="primary" density="compact" icon @click="copyToClipboard(contractAddress)" size="small">
              <template v-slot:default>
                <v-tooltip activator="parent" location="bottom">Copy</v-tooltip>

              <v-icon size="x-small" icon="mdi-content-copy"></v-icon>
              </template>
            </v-btn>
            
            <div style="flex-grow: 1"></div>

            <div style="font-size: 10px">
              <v-switch
                v-model="enableEncryption"
                hide-details
                color="green"
                density="compact"
                
              >
                <template v-slot:label>
                  <div style="display: flex; gap: 4px"><div>Encryption:</div> <div style="font-weight: bold; width: 25px" :color="enableEncryption ? 'green' : 'red'">{{enableEncryption ? 'On' : 'Off'}}</div></div>
                </template>            
              </v-switch>
            </div>
            
          </div>
          <div style="width: 100%; height: 1px; background-color: rgba(255, 255, 255, 0.171);"></div>
        
          <div style="margin-top: 10px; width: 100%; flex-grow: 1; position: relative; overflow: hidden;">
            <div>Contract Balance: {{ balance }} {{ enableEncryption ? 'FHET' : 'TKN' }}</div>
            <transition name="fade">
              <div class="lock-container" v-if="enableEncryption && showEncryptionAnimation">
                <audio ref="audioPlayer" :src="audioSource" />
                <Vue3Lottie
                  ref="lottieEncryptionOnAnimation"
                  :animationData="encryptionOn"
                  :loop="false"
                  @onComplete="encryptionAnimationComplete"
                />
              </div>
            </transition>
            <v-carousel v-model="pageIdx" style="height: 100%" hide-delimiters :show-arrows="false">
              <v-carousel-item>
                <div class="page">
                  <div style="line-height: 30px">
                    <template v-if="parseFloat(balance) < 0.1">
                      Oops... it looks like you don't have tokens in the contract.<br/>
                      You should mint some tokens or request someone to send you some.
                    </template>
                    <template v-else>
                      Mint some tokens to continue
                    </template>

                  </div>
                  <div class="empty-wallet-image"><img src="~/assets/empty-wallet.webp" style="width: 150px"/></div>
                  <v-btn :disabled="showLowTokenWarning || minting" :loading="minting" color="primary" rounded style="position: absolute; bottom: 10px; right: 10px" @click="mintToken(10)">Mint 10 Tokens</v-btn>
                </div>  

              </v-carousel-item>
              <v-carousel-item>
                <div class="page">
                  <div style="line-height: 30px">
                    <div style="font-weight: bold; font-size: 16px">Send Tokens:</div>
                    <div style="display: flex; gap: 10px">
                      <v-text-field :rules="recipientRules" ref="recipient" style="flex-grow: 2;" density="compact" label="Send To"></v-text-field>
                      <v-text-field :rules="amountRules" ref="amount" variant="filled" style="flex-grow: 1;" density="compact" label="Amount"></v-text-field>
                    </div>
                  </div>
                  <v-btn :disabled="transferring || minting" :loading="transferring" color="primary" rounded style="position: absolute; bottom: 10px; right: 10px" @click="sendTokens()">
                    Send
                  </v-btn>
                  <v-btn :disabled="showLowTokenWarning || minting || transferring" :loading="minting" color="primary" rounded style="position: absolute; bottom: 10px; left: 10px" @click="mintToken(10)">Mint 10 More Tokens</v-btn>
                </div>
              </v-carousel-item>            
            </v-carousel>
          </div>
        </div>
        <v-expand-transition>
          <div class="info-box" v-show="info !== ''" :style="infoBoxAnimatedStyle" >
            <div>
              {{ info }}
            </div>
            <div v-if="showProgress" style="position: absolute; left: 15px; bottom: 0px; width: calc(100% - 30px); height: 3px">
              <v-progress-linear style="width: 100%; height: 3px"
              indeterminate
              color="orange-darken-2"
              ></v-progress-linear>
            </div>
          </div>        
        </v-expand-transition>
      </div>
      <div @click="toggleQR" class="qr-container" :style="qrStyle">
        <qrcode-vue style="width: 100%; height: 100%" :size="500" :value="mmDeepLink" level="H" />
      </div>
  

    </div>
    <div class="history-panel">
      <v-list style="width: 95%; background: none; color: white">
        <v-list-subheader color="white">Last UI Activity</v-list-subheader>

        <v-list-item
          v-for="(item, i) in historyItems"
          :key="i"
          :value="item"
          color="primary"
        >
          <template v-slot:prepend>
            <v-tooltip activator="parent" location="start">{{ item.encrypted ? "Encrypted" : "Not Encrypted"}}</v-tooltip>
            <v-icon :icon="item.encrypted ? 'mdi-lock' : 'mdi-lock-open'"></v-icon>
          </template>
          <template v-slot:append>
            <v-btn icon="mdi-open-in-new" density="compact" @click="openExplorer(item.tx)" ></v-btn>
          </template>
          <v-list-item-title>{{ shortAddress(item.tx) }}</v-list-item-title>
          <v-list-item-subtitle>Action: {{ item.action }}</v-list-item-subtitle>
          <v-list-item-subtitle>Status: {{ item.status }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
      <div style="width: 100%; text-align: center; margin-top: 20px">
        <v-btn color="primary" rounded v-if="historyItems.length > 0" @click="clearHistory">Clear History</v-btn>
      </div>
    </div>
  </div>
</template>


<style scoped>

  .main {
    width: 100vw;
    color: white;
    display: flex; 
    flex-direction: row; 
    justify-content: flex-start;
  }

  .settings-panel {
    min-width: 280px;
    height: 100vh;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;

    background-image: linear-gradient(
      to bottom, 
      rgba(0, 0, 0, 0.0),
      rgba(10, 10, 10, 0.3)
    );
    backdrop-filter: blur(7px);
    border-right-width: 2px;    
    border-image: 
    linear-gradient(
      to bottom, 
      rgba(0, 0, 0, 0.0) 100px,
      #FF5C00
    ) 0 100%;
  }

  .history-panel {
    min-width: 380px;
    height: 100vh;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    background-image: linear-gradient(
      to bottom, 
      rgba(0, 0, 0, 0.0),
      rgba(10, 10, 10, 0.3)
    );
    backdrop-filter: blur(7px);
    border-left-width: 2px;    
    border-image: 
    linear-gradient(
      to bottom, 
      rgba(0, 0, 0, 0.0) 100px,
      #FF5C00
    ) 0 100%;

  }


  .content-blocker {
    position: absolute; 
    top: 90px;
    width: 100%; 
    height: 100%; 
    /* background-color: rgba(0, 0, 0, 0.5);  */
    background: linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 80%, rgba(0,0,0,0.0) 100%);


    z-index: 99; 
    backdrop-filter: blur(7px);
  }

  .content-panel {
    position: relative;
    display: flex; 
    width: 100%;
    height: 100vh;
  }  

  .logo {
    height: 70px;
    margin-bottom: 20px;
    z-index: 100;
  }


  .btn {
    width: auto;
    color: white    
  }

  .connect-wallet {
    max-width: 200px;
  }



.connect-wallet-animate::after {
  content: '';
  width: 30px; height: 30px;
  border-radius: 100%;
  border: 6px solid #ff6600;
  position: absolute;
  z-index: -1;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ring-1 1.5s infinite;
}

.button-focus-animation::after {
  content: '';
  width: 30px; height: 30px;
  border-radius: 100%;
  border: 3px solid #ff6600;
  position: absolute;
  z-index: -1;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: ring-2 1.5s infinite;  
}

@keyframes ring-1 {
  0% {
    width: 30px;
    height: 30px;
    opacity: 1;
  }
  100% {
    width: 200px;
    height: 200px;
    opacity: 0;
  }
}

@keyframes ring-2 {
  0% {
    width: 30px;
    height: 30px;
    opacity: 1;
  }
  100% {
    width: 100px;
    height: 100px;
    opacity: 0;
  }
}

  .connected-wallet {
    margin-left: -30px;
  }

  .action-panel {
    margin-left: 20px;
    margin-top: 100px;
    padding: 10px;
    width: 600px; 
    height: 300px;
    border-radius: 15px;
    
    backdrop-filter: blur(7px);

    border: 1px solid rgba(255, 255, 255, 0.274);
    
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    align-items: stretch;
  }

  .action-panel.non-encrypted {
    background-color: rgba(0, 37, 61, 0.13);
  }

  .action-panel.encrypted {
    background-color: rgba(61, 24, 0, 0.13);
  }

  .account-info {

      border-radius: 15px; 
      padding: 10px; 
      width: 95%;

      /* border: 2px solid white;  */
      border-left-width: 1px;
      border-right-width: 1px;
      border-image: 
      linear-gradient(
        to top, 
        rgba(0, 0, 0, 0.0) ,
        rgba(255, 255, 255, 0.5),
        rgba(0, 0, 0, 0.0) 
      ) 0 100%;
  }

  .empty-wallet-image {
    position: absolute; 
    left: 10px; 
    bottom: 10px;  
    z-index: -1;   
    -webkit-mask-image: -webkit-gradient(linear, right bottom, left top, from(rgba(0,0,0,0.2)), to(rgba(0,0,0,0)));    
  }
  
  .contract-box {
    background-color: white; 
    color: black; 
    padding: 6px; 
    border-radius: 8px;  
    z-index: 2;
    box-shadow: inset 0 0 1px black;
  }

  .info-box {
    position: relative;
    margin-left: 20px;
    width: 600px; 
    height: var(--info-height); 
    margin-top: -7px; 
    border-radius: 0px 0px 15px 15px;    
    background-color: var(--bg-color);
    backdrop-filter: blur(7px);
    z-index: -1;
    /* line-height: 45px; */
    padding-top: 12px;
    padding-left: 10px;
    font-size: 12px;
    transition-property: height;
    transition-timing-function: cubic-bezier(0.47, 1.64, 0.41, 0.8);
    transition-duration: 0.3s;
  }

.lock-container {
  position: absolute; 
  z-index: 90; 
  width: 200px; 
  height: 200px; 
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 50%; 
  display: flex; 
  justify-content: center; 
  align-items: center;
  backdrop-filter: blur(7px);

  left: 50%; 
  top: 50%; 
  transform: translate(-50%, -50%);
}

.pages {
  display: flex;
	width: 200%;
  height: 100%;   
	/* box-sizing: border-box;	   */
}

.page {
  width: 100%; 
  height: calc(100% - 20px); 
  
  display: flex; 
  flex-direction: column; 
  position: relative; 
  padding-top: 10px;
  transition: all 0.7s;
}

.data-table {
  background-color: rgba(0, 0, 0, 0.075);
  border-collapse: separate;
  border-spacing: 2px; /* Adjust as needed */
  backdrop-filter: blur(7px);
  min-width: 450px; 
}

.data-table th {
  padding: 5px;
  background-color: #FC4A1A;
  text-align: left;
}

.data-table td {
  padding: 5px;
  background-color: rgba(128, 128, 128, 0.164);
}

</style>

<style lang="scss" scoped>
.triangle-tooltip {
 position: relative;
 background-color: rgba(0, 0, 0, 1);
 padding: 10px;
 width: 350px;
 height: 130px;
 border-radius: 0.55em;
 display: flex;
 justify-content: center;
 align-items: center;
 font-size: 14px;
 border: 2px solid rgba(255, 255, 255, 0.164);
 
}

.triangle {
 display: block;
 height: 20px;
 width: 20px;
 background-color: inherit;
 border: inherit;
 position: absolute;
 top: -10px;
 left: calc(50% - 10px);
 clip-path: polygon(0% 0%, 100% 100%, 0% 100%);
 transform: rotate(135deg);
 border-radius: 0 0 0 0.25em;
}

.qr-container {
  position: absolute; 
  bottom: 30px; 
  left: 30px; 
  height: var(--qr-size); 
  width: var(--qr-size); 
  background-color: white; 
  padding: var(--qr-padding); 
  border-radius: var(--qr-radius); 
  cursor: pointer;
  transition: all .4s cubic-bezier(.47,1.64,.41,.8);
}



</style>
