import fs from 'node:fs';
import path from 'node:path';
import selfsigned from 'selfsigned';
import { getLocalIPv4s } from './ip';

export interface CertificateFiles {
  key: string;
  cert: string;
}

export function ensureCertificate(dir: string): CertificateFiles {
  const keyPath = path.join(dir, 'server.key');
  const certPath = path.join(dir, 'server.cert');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath, 'utf8'),
      cert: fs.readFileSync(certPath, 'utf8'),
    };
  }

  fs.mkdirSync(dir, { recursive: true });
  const ips = getLocalIPv4s();

  const pems = selfsigned.generate(
    [{ name: 'commonName', value: 'build-master-vr.local' }],
    {
      days: 825,
      keySize: 2048,
      algorithm: 'sha256',
      extensions: [
        { name: 'basicConstraints', cA: true },
        { name: 'keyUsage', keyCertSign: true, digitalSignature: true, keyEncipherment: true },
        { name: 'extKeyUsage', serverAuth: true },
        {
          name: 'subjectAltName',
          altNames: [
            { type: 2, value: 'localhost' },
            ...ips.map((ip) => ({ type: 7, ip })),
          ],
        },
      ],
    },
  );

  fs.writeFileSync(keyPath, pems.private, 'utf8');
  fs.writeFileSync(certPath, pems.cert, 'utf8');
  return { key: pems.private, cert: pems.cert };
}