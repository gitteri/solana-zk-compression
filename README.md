# solana-zk-compression
An investigation into using general account compression for token accounts

## Resources
- https://www.zkcompression.com/
- https://www.zkcompression.com/developers/add-compressed-token-support-to-your-wallet
- https://www.helius.dev/blog/all-you-need-to-know-about-compression-on-solana
- https://www.helius.dev/blog/solana-builders-zk-compression
- https://github.com/lightprotocol/js/compressed-token
- https://github.com/lightprotocol/js/stateless.js


Notes:
* light protocol does not work with token-2022
* What is the "seed" for a new compressed account?
* Accounts
    * address is derived from seed and address tree
        export const defaultTestStateTreeAccounts = () => {
            return {
                nullifierQueue: new PublicKey(nullifierQueuePubkey),
                merkleTree: new PublicKey(merkletreePubkey),
                merkleTreeHeight: DEFAULT_MERKLE_TREE_HEIGHT,
                addressTree: new PublicKey(addressTree),
                addressQueue: new PublicKey(addressQueue),
            };
        };

        export const nullifierQueuePubkey =
            'nfq1NvQDJ2GEgnS8zt9prAe8rjjpAW1zFkrvZoBR148';

        export const merkletreePubkey = 'smt1NamzXdq4AMqS2fS2F1i5KTYPZRhoHgWx38d8WsT';
        export const addressTree = 'amt1Ayt45jfbdw5YSo7iz6WZxUmnZsQTYXy82hVwyC2';
        export const addressQueue = 'aq1S9z4reTSQAdgWHGD2zDaS39sjGrAxbR31vxJ2F4F';