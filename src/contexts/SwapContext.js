import React, { useState, createContext, useContext } from "react";
import Pact from "pact-lang-api";
import tokenData from "../constants/cryptoCurrencies";
import pwPrompt from "../components/alerts/pwPrompt";
import { AccountContext } from "./AccountContext";
import { WalletContext } from "./WalletContext";
import { reduceBalance } from "../utils/reduceBalance";
import { PactContext } from "./PactContext";
import { decryptKey } from "../utils/keyUtils";

export const SwapContext = createContext();

const creationTime = () => Math.round(new Date().getTime() / 1000) - 10;
const NETWORKID = process.env.REACT_APP_KDA_NETWORK_ID || "testnet04";
const GAS_PRICE = 0.000000000001;
const chainId = process.env.REACT_APP_KDA_CHAIN_ID || "0";
const network =
  process.env.REACT_APP_KDA_NETWORK ||
  `https://api.testnet.chainweb.com/chainweb/0.0/${NETWORKID}/chain/${chainId}/pact`;

export const SwapProvider = (props) => {
  const pact = useContext(PactContext);
  const account = useContext(AccountContext);
  const wallet = useContext(WalletContext);
  const [pairAccount, setPairAccount] = useState("");
  const [cmd, setCmd] = useState(null);
  const [localRes, setLocalRes] = useState(null);
  const [isWaitingForWalletAuth, setIsWaitingForWalletAuth] = useState(false);
  const [walletSuccess, setWalletSuccess] = useState(false);
  const [walletError, setWalletError] = useState(null);

  var mkReq = function (cmd) {
    return {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(cmd),
    };
  };

  var parseRes = async function (raw) {
    const rawRes = await raw;
    const res = await rawRes;
    if (res.ok) {
      const resJSON = await rawRes.json();
      return resJSON;
    } else {
      const resTEXT = await rawRes.text();
      return resTEXT;
    }
  };

  const getPairAccount = async (token0, token1) => {
    try {
      let data = await Pact.fetch.local(
        {
          pactCode: `(at 'account (kswap.exchange.get-pair ${token0} ${token1}))`,
          meta: Pact.lang.mkMeta(
            "",
            chainId,
            GAS_PRICE,
            3000,
            creationTime(),
            600
          ),
        },
        network
      );
      if (data.result.status === "success") {
        setPairAccount(data.result.data);
        return data.result.data;
      }
    } catch (e) {
      console.log(e);
    }
  };

  const swap = async (token0, token1, isSwapIn) => {
    try {
      let pair = await getPairAccount(token0.address, token1.address);

      const inPactCode = `(kswap.exchange.swap-exact-in
          (read-decimal 'token0Amount)
          (read-decimal 'token1AmountWithSlippage)
          [${token0.address} ${token1.address}]
          ${JSON.stringify(account.account)}
          ${JSON.stringify(account.account)}
          (read-keyset 'user-ks)
        )`;
      const outPactCode = `(kswap.exchange.swap-exact-out
          (read-decimal 'token1Amount)
          (read-decimal 'token0AmountWithSlippage)
          [${token0.address} ${token1.address}]
          ${JSON.stringify(account.account)}
          ${JSON.stringify(account.account)}
          (read-keyset 'user-ks)
        )`;
      const cmd = {
        pactCode: isSwapIn ? inPactCode : outPactCode,
        keyPairs: {
          publicKey: account.guard.keys[0],
          secretKey: wallet.privKey,
          clist: [
            {
              name: `${token0.address}.TRANSFER`,
              args: [
                account.account,
                pair,
                isSwapIn
                  ? reduceBalance(
                      token0.amount,
                      tokenData[token0.coin].precision
                    )
                  : reduceBalance(
                      token0.amount * (1 + parseFloat(pact.slippage)),
                      tokenData[token0.coin].precision
                    ),
              ],
            },
          ],
        },
        envData: {
          "user-ks": account.guard,
          token0Amount: reduceBalance(
            token0.amount,
            tokenData[token0.coin].precision
          ),
          token1Amount: reduceBalance(
            token1.amount,
            tokenData[token1.coin].precision
          ),
          token1AmountWithSlippage: reduceBalance(
            token1.amount * (1 - parseFloat(pact.slippage)),
            tokenData[token1.coin].precision
          ),
          token0AmountWithSlippage: reduceBalance(
            token0.amount * (1 + parseFloat(pact.slippage)),
            tokenData[token0.coin].precision
          ),
        },
        meta: Pact.lang.mkMeta("", "", 0, 0, 0, 0),
        networkId: NETWORKID,
        meta: Pact.lang.mkMeta(
          account.account,
          chainId,
          GAS_PRICE,
          3000,
          creationTime(),
          600
        ),
      };
      setCmd(cmd);
      let data = await Pact.fetch.send(cmd, network);
    } catch (e) {
      console.log(e);
    }
  };

  const swapLocal = async (token0, token1, isSwapIn) => {
    try {
      let privKey = wallet.signing.key;
      if (wallet.signing.method === "pk+pw") {
        const pw = await pwPrompt();
        privKey = await decryptKey(pw);
      }
      if (privKey.length !== 64) {
        return -1;
      }
      const ct = creationTime();
      let pair = await getPairAccount(token0.address, token1.address);
      const inPactCode = `(kswap.exchange.swap-exact-in
          (read-decimal 'token0Amount)
          (read-decimal 'token1AmountWithSlippage)
          [${token0.address} ${token1.address}]
          ${JSON.stringify(account.account)}
          ${JSON.stringify(account.account)}
          (read-keyset 'user-ks)
        )`;
      const outPactCode = `(kswap.exchange.swap-exact-out
          (read-decimal 'token1Amount)
          (read-decimal 'token0AmountWithSlippage)
          [${token0.address} ${token1.address}]
          ${JSON.stringify(account.account)}
          ${JSON.stringify(account.account)}
          (read-keyset 'user-ks)
        )`;
      const cmd = {
        pactCode: isSwapIn ? inPactCode : outPactCode,
        keyPairs: {
          publicKey: account.guard.keys[0],
          secretKey: privKey,
          clist: [
            {
              name: "kswap.gas-station.GAS_PAYER",
              args: ["free-gas", { int: 1 }, 1.0],
            },
            {
              name: `${token0.address}.TRANSFER`,
              args: [
                account.account,
                pair,
                isSwapIn
                  ? reduceBalance(
                      token0.amount,
                      tokenData[token0.coin].precision
                    )
                  : reduceBalance(
                      token0.amount * (1 + parseFloat(pact.slippage)),
                      tokenData[token0.coin].precision
                    ),
              ],
            },
          ],
        },
        envData: {
          "user-ks": account.guard,
          token0Amount: reduceBalance(
            token0.amount,
            tokenData[token0.coin].precision
          ),
          token1Amount: reduceBalance(
            token1.amount,
            tokenData[token1.coin].precision
          ),
          token1AmountWithSlippage: reduceBalance(
            token1.amount * (1 - parseFloat(pact.slippage)),
            tokenData[token1.coin].precision
          ),
          token0AmountWithSlippage: reduceBalance(
            token0.amount * (1 + parseFloat(pact.slippage)),
            tokenData[token0.coin].precision
          ),
        },
        networkId: NETWORKID,
        meta: Pact.lang.mkMeta(
          "kswap-free-gas",
          chainId,
          GAS_PRICE,
          3000,
          ct,
          600
        ),
      };
      setCmd(cmd);
      let data = await Pact.fetch.local(cmd, network);
      setLocalRes(data);
      return data;
    } catch (e) {
      console.log(e);
      setLocalRes({});
      return -1;
    }
  };

  const swapWallet = async (token0, token1, isSwapIn) => {
    try {
      const inPactCode = `(kswap.exchange.swap-exact-in
          (read-decimal 'token0Amount)
          (read-decimal 'token1AmountWithSlippage)
          [${token0.address} ${token1.address}]
          ${JSON.stringify(account.account)}
          ${JSON.stringify(account.account)}
          (read-keyset 'user-ks)
        )`;
      const outPactCode = `(kswap.exchange.swap-exact-out
          (read-decimal 'token1Amount)
          (read-decimal 'token0AmountWithSlippage)
          [${token0.address} ${token1.address}]
          ${JSON.stringify(account.account)}
          ${JSON.stringify(account.account)}
          (read-keyset 'user-ks)
        )`;
      const signCmd = {
        pactCode: isSwapIn ? inPactCode : outPactCode,
        caps: [
          Pact.lang.mkCap(
            "Gas Station",
            "free gas",
            "kswap.gas-station.GAS_PAYER",
            ["free-gas", { int: 1 }, 1.0]
          ),
          Pact.lang.mkCap(
            "transfer capability",
            "trasnsfer token in",
            `${token0.address}.TRANSFER`,
            [
              account.account,
              pact.pair.account,
              isSwapIn
                ? reduceBalance(token0.amount, tokenData[token0.coin].precision)
                : reduceBalance(
                    token0.amount * (1 + parseFloat(pact.slippage)),
                    tokenData[token0.coin].precision
                  ),
            ]
          ),
        ],
        sender: "kswap-free-gas",
        gasLimit: 3000,
        gasPrice: GAS_PRICE,
        chainId: chainId,
        ttl: 600,
        envData: {
          "user-ks": account.guard,
          token0Amount: reduceBalance(
            token0.amount,
            tokenData[token0.coin].precision
          ),
          token1Amount: reduceBalance(
            token1.amount,
            tokenData[token1.coin].precision
          ),
          token0AmountWithSlippage: reduceBalance(
            token0.amount * (1 + parseFloat(pact.slippage)),
            tokenData[token0.coin].precision
          ),
          token1AmountWithSlippage: reduceBalance(
            token1.amount * (1 - parseFloat(pact.slippage)),
            tokenData[token1.coin].precision
          ),
        },
        signingPubKey: account.guard.keys[0],
        networkId: NETWORKID,
      };
      //alert to sign tx
      /* walletLoading(); */
      setIsWaitingForWalletAuth(true);
      const cmd = await Pact.wallet.sign(signCmd);
      console.log("cmd: ", cmd);
      //close alert programmatically
      /* swal.close(); */
      setIsWaitingForWalletAuth(false);
      setWalletSuccess(true);
      //set signedtx
      setCmd(cmd);
      let data = await fetch(`${network}/api/v1/local`, mkReq(cmd));
      data = await parseRes(data);
      setLocalRes(data);
      return data;
    } catch (e) {
      //wallet error alert
      /* setLocalRes({}); */
      if (e.message.includes("Failed to fetch"))
        setWalletError({
          error: true,
          title: "No Wallet",
          content: "Please make sure you open and login to your wallet.",
        });
      //walletError();
      else
        setWalletError({
          error: true,
          title: "Wallet Signing Failure",
          content:
            "You cancelled the transaction or did not sign it correctly. Please make sure you sign with the keys of the account linked in Kadenaswap.",
        }); //walletSigError();
      console.log(e);
    }
  };
  return (
    <SwapContext.Provider
      value={{
        swap,
        getPairAccount,
        swapLocal,
        swapWallet,
        localRes,
        isWaitingForWalletAuth,
        walletSuccess,
        setWalletSuccess,
        walletError,
        setWalletError,
      }}
    >
      {props.children}
    </SwapContext.Provider>
  );
};

export const SwapConsumer = SwapContext.Consumer;