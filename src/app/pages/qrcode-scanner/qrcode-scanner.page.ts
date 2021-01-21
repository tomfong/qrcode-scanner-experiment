import { Component, OnDestroy, OnInit } from '@angular/core';
import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner/ngx';
import { AlertController, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import * as CryptoJs from 'crypto-js';
import { environment as env } from 'src/environments/environment';

@Component({
  selector: 'app-qrcode-scanner',
  templateUrl: 'qrcode-scanner.page.html',
  styleUrls: ['qrcode-scanner.page.scss']
})
export class QrcodeScannerPage {

  scanSub: Subscription;

  constructor(
    private platform: Platform,
    private qrScanner: QRScanner,
    public alertController: AlertController
  ) {
    
  }

  ionViewDidEnter(): void {
    this.qrScan();
  }

  ionViewDidLeave(): void {
    this.qrScanner.hide();
    this.scanSub.unsubscribe();
  }

  qrScan(): void {
    this.qrScanner.prepare().then(
      async (status: QRScannerStatus) => {
        if (status.authorized) {
          this.qrScanner.show().then(
            () => {
              this.scanSub = this.qrScanner.scan().subscribe(
                async (text: string) => {
                  let finalText: string = '';
                  if (this.scanSub) {
                    this.scanSub.unsubscribe();
                  }
                  const qrValue = CryptoJs.AES.decrypt(text, env.secretEncKey).toString(CryptoJs.enc.Utf8);
                  const parts = qrValue.split(".");
                  if (parts.length !== 3) {
                    finalText = text;
                  } else {
                    const msg = parts[0] + '.' + parts[1];
                    const signature = CryptoJs.HmacSHA256(msg, env.secretSignKey).toString();
                    if (signature != parts[2]) {
                      finalText = "Invalid JWT (decoded: " + qrValue + ")";
                    } else {
                      finalText = "Success decoded: " + atob(parts[1]);
                    }
                  }
                  await this.presentAlert(finalText).then(() => {
                    this.qrScan();
                  });
                });
            }
          )
        } else if (status.denied) {
          await this.presentAlert("You need to grant camera permission").then(
            () => {
              this.qrScanner.openSettings();
            }
          );
          this.qrScan();
        } else {
          await this.presentAlert("Unknown error occurs");
          this.qrScan();
        }
    }).catch((e: any) => console.log('Error is', e));
  }

  async presentAlert(msg: string) {
    const alert = await this.alertController.create({
      // cssClass: 'my-custom-class',
      header: 'Message',
      message: msg,
      buttons: ['OK']
    });

    await alert.present();
  }

  base64UrlEncode(base64Text: string) {
    return base64Text.replace( "+", "-").replace("/", "_").replace("=", "");
  }

}