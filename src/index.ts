// TODO(ritave): Remove types after https://github.com/MetaMask/snaps-skunkworks/issues/367 is fixed
declare const wallet: {
  registerRpcMessageHandler: (
    handler: (originString: string, requestObject: any) => any,
  ) => void;
  request: (data: { method: string; params: any[] }) => Promise<any>;
};

wallet.registerRpcMessageHandler(async (originString, requestObject) => {
  switch (requestObject.method) {
    case 'hello':
      return wallet.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: `Hello, ${originString}!`,
            description:
              'This custom confirmation is just for display purposes.',
            textAreaContent:
              'But you can edit the snap source code to make it do something, if you want to!',
          },
        ],
      });
    default:
      throw new Error('Method not found.');
  }
});
