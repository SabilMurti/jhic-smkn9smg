import { MySkanilanConfig } from './types/index.js';
import { StudentsModule } from './modules/students.js';
import { WalletModule } from './modules/wallet.js';
import { QrPaymentModule } from './modules/qr.js';
import { PortalModule } from './modules/portal.js';

export class MySkanilanClient {
  public readonly baseUrl: string;
  public readonly students: StudentsModule;
  public readonly wallet: WalletModule;
  public readonly qr: QrPaymentModule;
  public readonly portal: PortalModule;

  constructor(config: MySkanilanConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:4000';
    this.students = new StudentsModule(this.baseUrl);
    this.wallet = new WalletModule(this.baseUrl);
    this.qr = new QrPaymentModule(this.baseUrl);
    this.portal = new PortalModule(this.baseUrl);
  }
}
