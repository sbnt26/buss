import Handlebars from 'handlebars';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { generateQRCode, type QRPaymentData } from './qr-payment';
import { formatCurrency } from './invoice-calculations';

export interface InvoiceData {
  invoiceNumber: string;
  variableSymbol: string;
  issueDate: Date;
  dueDate: Date;
  deliveryDate?: Date;
  subtotal: number;
  vatAmount: number;
  total: number;
  currency: string;
  notes?: string;
}

export interface OrganizationData {
  name: string;
  ico: string;
  dic?: string;
  isVatPayer: boolean;
  addressStreet: string;
  addressCity: string;
  addressZip: string;
  bankAccount?: string;
  iban?: string;
  bankName?: string;
  logoPath?: string;
}

export interface ClientData {
  name: string;
  ico?: string;
  dic?: string;
  addressStreet?: string;
  addressCity?: string;
  addressZip?: string;
}

export interface InvoiceItemData {
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  subtotal: number;
  vatAmount: number;
  total: number;
}

export async function renderInvoiceHTML(
  invoice: InvoiceData,
  organization: OrganizationData,
  client: ClientData,
  items: InvoiceItemData[]
): Promise<string> {
  let qrCodeDataUri = '';
  if (organization.iban) {
    const qrData: QRPaymentData = {
      iban: organization.iban,
      amount: invoice.total,
      currency: invoice.currency,
      variableSymbol: invoice.variableSymbol,
      message: `Faktura ${invoice.invoiceNumber}`,
      recipientName: organization.name,
    };
    qrCodeDataUri = await generateQRCode(qrData);
  }

  Handlebars.registerHelper('formatDate', (date: Date) => {
    return format(date, 'd. M. yyyy', { locale: cs });
  });

  Handlebars.registerHelper('formatCurrency', (amount: number, currency: string) => {
    return formatCurrency(amount, currency);
  });

  Handlebars.registerHelper('formatNumber', (value: number, decimals: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  });

  const template = Handlebars.compile(getInvoiceTemplate());

  return template({
    invoice,
    organization,
    client,
    items,
    qrCode: qrCodeDataUri,
    hasQRCode: !!qrCodeDataUri,
  });
}

function getInvoiceTemplate(): string {
  return `
<!DOCTYPE html>
<html lang="cs">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Faktura {{invoice.invoiceNumber}}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
        font-size: 11pt;
        color: #111827;
        background: #ffffff;
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 20mm 22mm;
        display: flex;
        flex-direction: column;
        gap: 18mm;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .header-left {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .title {
        font-size: 24pt;
        font-weight: 600;
        letter-spacing: 1px;
        text-transform: uppercase;
        margin: 0;
      }
      .invoice-number {
        font-size: 11pt;
        color: #475569;
      }
      .meta {
        text-align: right;
        font-size: 10pt;
        line-height: 1.4;
      }
      .meta span {
        display: block;
        font-weight: 600;
        color: #0f172a;
      }
      .divider {
        border: none;
        border-top: 1px solid #e2e8f0;
        margin: 0;
      }
      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px 24px;
      }
      .info-box {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 12px 14px;
      }
      .info-box h3 {
        margin: 0 0 6px;
        font-size: 10pt;
        text-transform: uppercase;
        letter-spacing: .8px;
        color: #64748b;
      }
      .info-line {
        font-size: 10.5pt;
        margin: 0 0 3px;
      }
      .table {
        width: 100%;
        border-collapse: collapse;
      }
      .table thead th {
        text-align: left;
        font-size: 10pt;
        padding: 10px 8px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        text-transform: uppercase;
        letter-spacing: .6px;
        color: #475569;
      }
      .table tbody td {
        padding: 9px 8px;
        border-bottom: 1px solid #edf2f7;
        font-size: 10.5pt;
      }
      .table td.right,
      .table th.right {
        text-align: right;
      }
      .summary {
        display: flex;
        align-items: stretch;
        gap: 24px;
      }
      .summary-main {
        flex: 1;
        display: flex;
      }
      .totals {
        flex: 1;
        padding: 18px 22px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
      }
      .totals-row {
        display: flex;
        justify-content: space-between;
        font-size: 10.5pt;
        margin-bottom: 6px;
      }
      .totals-row:last-child {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid #cbd5f5;
        font-weight: 600;
        font-size: 12pt;
        color: #0f172a;
      }
      .notes {
        font-size: 9.5pt;
        color: #475569;
        line-height: 1.5;
      }
      .footer {
        margin-top: auto;
        text-align: center;
        font-size: 9pt;
        color: #94a3b8;
      }
      .qr {
        text-align: right;
      }
      .qr img {
        width: 120px;
        height: 120px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <div class="header-left">
          <h1 class="title">Faktura</h1>
          <div class="invoice-number">Číslo faktury: <strong>{{invoice.invoiceNumber}}</strong></div>
          <div class="invoice-number">Variabilní symbol: <strong>{{invoice.variableSymbol}}</strong></div>
        </div>
        <div class="meta">
          <div>Datum vystavení:<span>{{formatDate invoice.issueDate}}</span></div>
          <div>Datum splatnosti:<span>{{formatDate invoice.dueDate}}</span></div>
          {{#if invoice.deliveryDate}}
          <div>Datum dodání:<span>{{formatDate invoice.deliveryDate}}</span></div>
          {{/if}}
        </div>
      </div>
      <hr class="divider" />

      <div class="info-grid">
        <div class="info-box">
          <h3>Dodavatel</h3>
          <p class="info-line"><strong>{{organization.name}}</strong></p>
          <p class="info-line">IČO: {{organization.ico}}</p>
          {{#if organization.dic}}<p class="info-line">DIČ: {{organization.dic}}</p>{{/if}}
          <p class="info-line">{{organization.addressStreet}}</p>
          <p class="info-line">{{organization.addressZip}} {{organization.addressCity}}</p>
        </div>
        <div class="info-box">
          <h3>Odběratel</h3>
          <p class="info-line"><strong>{{client.name}}</strong></p>
          {{#if client.ico}}<p class="info-line">IČO: {{client.ico}}</p>{{/if}}
          {{#if client.dic}}<p class="info-line">DIČ: {{client.dic}}</p>{{/if}}
          {{#if client.addressStreet}}<p class="info-line">{{client.addressStreet}}</p>{{/if}}
          {{#if client.addressZip}}<p class="info-line">{{client.addressZip}} {{client.addressCity}}</p>{{/if}}
        </div>
        <div class="info-box">
          <h3>Platební údaje</h3>
          <p class="info-line">Číslo účtu: {{#if organization.bankAccount}}{{organization.bankAccount}}{{else}}-{{/if}}</p>
          <p class="info-line">IBAN: {{#if organization.iban}}{{organization.iban}}{{else}}-{{/if}}</p>
          <p class="info-line">Banka: {{#if organization.bankName}}{{organization.bankName}}{{else}}-{{/if}}</p>
          <p class="info-line">Plátce DPH: {{#if organization.isVatPayer}}Ano{{else}}Ne{{/if}}</p>
        </div>
        <div class="info-box">
          <h3>Symboly</h3>
          <p class="info-line">Variabilní symbol: {{invoice.variableSymbol}}</p>
          <p class="info-line">Konstantní symbol: -</p>
          <p class="info-line">Způsob platby: Bankovním převodem</p>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Popis</th>
            <th class="right">Množství</th>
            <th class="right">Jedn. cena</th>
            <th class="right">DPH %</th>
            <th class="right">DPH</th>
            <th class="right">Celkem</th>
          </tr>
        </thead>
        <tbody>
          {{#each items}}
          <tr>
            <td>{{position}}</td>
            <td>{{description}}</td>
            <td class="right">{{formatNumber quantity 2}}{{#if unit}} {{unit}}{{/if}}</td>
            <td class="right">{{formatCurrency unitPrice ../invoice.currency}}</td>
            <td class="right">{{formatNumber vatRate 0}}%</td>
            <td class="right">{{formatCurrency vatAmount ../invoice.currency}}</td>
            <td class="right">{{formatCurrency total ../invoice.currency}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-main">
          <div class="totals">
            <div class="totals-row">
              <span>Mezisoučet</span>
              <span>{{formatCurrency invoice.subtotal invoice.currency}}</span>
            </div>
            <div class="totals-row">
              <span>DPH</span>
              <span>{{formatCurrency invoice.vatAmount invoice.currency}}</span>
            </div>
            <div class="totals-row">
              <span>Celkem k úhradě</span>
              <span>{{formatCurrency invoice.total invoice.currency}}</span>
            </div>
          </div>
        </div>
        {{#if hasQRCode}}
        <div class="qr">
          <img src="{{qrCode}}" alt="QR platba" />
          <div style="margin-top:6px;font-size:9pt;color:#64748b;">QR platba</div>
        </div>
        {{/if}}
      </div>

      <div class="notes">
        {{#if invoice.notes}}
          <strong>Poznámka:</strong><br />
          {{invoice.notes}}
        {{else}}
          Děkujeme za spolupráci. V případě dotazů nás neváhejte kontaktovat.
        {{/if}}
      </div>

      <div class="footer">
        Vytvořeno pomocí BussApp
      </div>
    </div>
  </body>
</html>
  `;
}
