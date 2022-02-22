import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';

interface IWalletProviderContext {
  walletProvider: ethers.providers.Web3Provider | undefined;
  signer: ethers.Signer | undefined;
  web3Modal: Web3Modal | undefined;
  connect: Web3Modal['connect'];
  disconnect: Web3Modal['clearCachedProvider'];
  accounts: string[] | undefined;
  currentChainId: number | undefined;
  isLoggedIn: boolean;
  rawEthereumProvider: undefined | any;
}

const WalletProviderContext = createContext<IWalletProviderContext | null>(
  null,
);

const WalletProviderProvider: React.FC = props => {
  const [walletProvider, setWalletProvider] = useState<
    undefined | ethers.providers.Web3Provider
  >();

  const [signer, setSigner] = useState<ethers.Signer>();

  const [web3Modal, setWeb3Modal] = useState<undefined | Web3Modal>();

  const [rawEthereumProvider, setRawEthereumProvider] = useState<any>();

  const [accounts, setAccounts] = useState<string[]>();
  const [currentChainId, setCurrentChainId] = useState<number>();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    if (
      rawEthereumProvider &&
      walletProvider &&
      currentChainId &&
      accounts &&
      accounts[0] &&
      accounts[0].length > 0
    ) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, [rawEthereumProvider, walletProvider, currentChainId, accounts]);

  useEffect(() => {
    if (!walletProvider) return;
    setSigner(walletProvider.getSigner());
  }, [walletProvider]);

  useEffect(() => {
    setWeb3Modal(
      new Web3Modal({
        // network: "mumbai", // optional
        cacheProvider: true, // optional
        providerOptions: {
          walletconnect: {
            package: WalletConnectProvider, // required
            options: {
              infuraId: process.env.REACT_APP_INFURA_ID, // required
            },
          },
        },
      }),
    );
  }, []);

  // because provider does not fire events initially, we need to fetch initial values for current chain from walletProvider
  // subsequent changes to these values however do fire events, and we can just use those event handlers
  useEffect(() => {
    if (!walletProvider) return;
    (async () => {
      let { chainId } = await walletProvider.getNetwork();
      let accounts = await walletProvider.listAccounts();
      setAccounts(accounts.map(a => a.toLowerCase()));
      setCurrentChainId(chainId);
    })();
  }, [walletProvider]);

  const reinit = (changedProvider: any) => {
    setWalletProvider(new ethers.providers.Web3Provider(changedProvider));
  };

  // setup event handlers for web3 provider given by web3-modal
  // this is the provider injected by metamask/fortis/etc
  useEffect(() => {
    if (!rawEthereumProvider) return;

    // Subscribe to accounts change
    rawEthereumProvider.on('accountsChanged', (accounts: string[]) => {
      // console.log(accounts);
      setAccounts(accounts.map(a => a.toLowerCase()));
      reinit(rawEthereumProvider);
    });

    // Subscribe to chainId change
    rawEthereumProvider.on('chainChanged', (chainId: number) => {
      // console.log(chainId);
      setCurrentChainId(chainId);
      reinit(rawEthereumProvider);
    });

    // Subscribe to provider connection
    rawEthereumProvider.on('connect', (info: { chainId: number }) => {
      // console.log(info);
      setCurrentChainId(info.chainId);
      reinit(rawEthereumProvider);
    });

    // Subscribe to provider disconnection
    rawEthereumProvider.on(
      'disconnect',
      (error: { code: number; message: string }) => {
        console.error(error);
      },
    );
  }, [rawEthereumProvider]);

  const connect = useCallback(async () => {
    if (!web3Modal) {
      console.error('Web3Modal not initialized.');
      return;
    }
    let provider = await web3Modal.connect();
    setRawEthereumProvider(provider);
    setWalletProvider(new ethers.providers.Web3Provider(provider));
  }, [web3Modal]);

  const disconnect = useCallback(async () => {
    if (!web3Modal) {
      console.error('Web3Modal not initialized.');
      return;
    }
    web3Modal.clearCachedProvider();
    setRawEthereumProvider(undefined);
    setWalletProvider(undefined);
  }, [web3Modal]);

  return (
    <WalletProviderContext.Provider
      value={{
        rawEthereumProvider,
        walletProvider,
        signer,
        web3Modal,
        connect,
        disconnect,
        accounts,
        currentChainId,
        isLoggedIn,
      }}
      {...props}
    />
  );
};

const useWalletProvider = () => useContext(WalletProviderContext);
export { WalletProviderProvider, useWalletProvider };
