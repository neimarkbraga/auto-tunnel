require('dotenv').config();
const { readFileSync } = require('fs');
const { Client } = require('ssh2');
const { Socket } = require('net');

const config = {
  host: process.env.TUNNEL_APP_HOST,
  port: Number(process.env.TUNNEL_APP_PORT),
  username: process.env.TUNNEL_APP_USERNAME,
  privateKey: readFileSync(process.env.TUNNEL_APP_PRIVATE_KEY_FILE),

  remoteHost: process.env.TUNNEL_APP_REMOTE_HOST || '127.0.0.1',
  remotePort: Number(process.env.TUNNEL_APP_REMOTE_PORT),
  localHost: process.env.TUNNEL_APP_LOCAL_HOST,
  localPort: Number(process.env.TUNNEL_APP_LOCAL_PORT) || '127.0.0.1',

  keepaliveInterval: Number(process.env.TUNNEL_APP_KEEP_ALIVE_INTERVAL),
  reconnectTimeout: Number(process.env.TUNNEL_APP_RECONNECT_TIMEOUT)
};

const startTunnel = () => {
  const client = new Client();

  client.on('ready', () => {
    client.forwardIn(config.remoteHost, config.remotePort, (err) => {
      if (err) throw err;
      else console.log(`listening to remote: ${config.remoteHost}:${config.remotePort}`);
    });
  });

  client.on('tcp connection', (info, accept, reject) => {
    let remote;
    const srcSocket = new Socket();

    srcSocket.on("error", err => {
      if (remote === undefined) reject();
      else remote.end();
    });

    srcSocket.connect(config.localPort, config.localHost, () => {
      remote = accept();
      srcSocket.pipe(remote).pipe(srcSocket);
    });
  });

  client.on('error', (e) => {
    console.error('Error:', e);
  });

  client.on('close', () => {
    console.log('Connection closed.');
    restartTunnel();
  });

  client.connect({
    host: config.host,
    port: config.port,
    username: config.username,
    privateKey: config.privateKey,
    keepaliveInterval: config.keepaliveInterval
  });
};

const restartTunnel = () => {
  console.log(`Restarting in ${config.reconnectTimeout / 1000}.`);
  setTimeout(startTunnel, config.reconnectTimeout);
};

startTunnel();