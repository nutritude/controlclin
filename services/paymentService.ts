// ============================================================
// paymentService.ts — ControlClin Payment Gateway Abstraction
// Preparado para integração com Stripe, MercadoPago ou Asaas
// ============================================================

export type PaymentMethod = 'PIX' | 'CREDIT_CARD';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'DECLINED' | 'REFUNDED' | 'CANCELED';

export interface CreditCardData {
  holderName: string;
  number: string;       // Apenas para exibição mascarada, nunca armazenar
  expMonth: string;
  expYear: string;
  cvv: string;
  installments: number;
}

export interface PixData {
  qrCode?: string;
  qrCodeBase64?: string;
  copyPaste?: string;
  expiresAt?: string;
}

export interface PaymentIntent {
  id: string;
  clinicId: string;
  planId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;               // Valor total em centavos
  installments: number;
  installmentAmount: number;    // Valor da parcela em centavos
  currency: 'BRL';
  customerEmail: string;
  customerDocument: string;     // CPF ou CNPJ
  customerName: string;
  createdAt: string;
  paidAt?: string;
  pixData?: PixData;
  cardLastFour?: string;
  cardBrand?: string;
  gatewayTransactionId?: string;
  metadata?: Record<string, any>;
}

export interface InstallmentOption {
  installments: number;
  installmentAmount: number;    // em centavos
  totalAmount: number;          // em centavos
  label: string;
  hasInterest: boolean;
}

// ─── CONFIGURAÇÃO DE PARCELAMENTO ──────────────────────────

const INSTALLMENT_RULES: Record<string, { maxInstallments: number }> = {
  monthly: { maxInstallments: 1 },
  quarterly: { maxInstallments: 3 },
  semester: { maxInstallments: 6 },
  yearly: { maxInstallments: 12 },
};

// ─── VALIDAÇÕES DE CARTÃO ──────────────────────────────────

function detectCardBrand(number: string): string {
  const cleaned = number.replace(/\D/g, '');
  if (/^4/.test(cleaned)) return 'Visa';
  if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
  if (/^3[47]/.test(cleaned)) return 'Amex';
  if (/^(636368|438935|504175|451416|636297)/.test(cleaned) || /^(5067|4576|4011)/.test(cleaned)) return 'Elo';
  if (/^606282/.test(cleaned)) return 'Hipercard';
  return 'Outro';
}

function luhnCheck(number: string): boolean {
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) return false;
  let sum = 0;
  let alternate = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let n = parseInt(cleaned[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim().substring(0, 19);
}

function formatExpiry(value: string): string {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').substring(0, 5);
}

function maskCardNumber(number: string): string {
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.length < 4) return '****';
  return `•••• •••• •••• ${cleaned.slice(-4)}`;
}

// ─── SERVIÇO DE PAGAMENTO ──────────────────────────────────

export const paymentService = {

  // ── Cálculo de Parcelas ────────────────────────────────────
  getInstallmentOptions(totalAmountReais: number, cycle: string): InstallmentOption[] {
    const totalCents = Math.round(totalAmountReais * 100);
    const maxInstallments = INSTALLMENT_RULES[cycle]?.maxInstallments || 1;
    const options: InstallmentOption[] = [];

    for (let i = 1; i <= maxInstallments; i++) {
      const installmentCents = Math.ceil(totalCents / i);
      options.push({
        installments: i,
        installmentAmount: installmentCents,
        totalAmount: totalCents,
        label: i === 1
          ? `À vista — R$ ${(totalCents / 100).toFixed(2).replace('.', ',')}`
          : `${i}x de R$ ${(installmentCents / 100).toFixed(2).replace('.', ',')} sem juros`,
        hasInterest: false,
      });
    }

    return options;
  },

  // ── Cálculo do Total baseado no Ciclo ──────────────────────
  calculateTotalForCycle(monthlyPrice: number, cycle: string, discount: number): number {
    const months: Record<string, number> = { monthly: 1, quarterly: 3, semester: 6, yearly: 12 };
    const m = months[cycle] || 1;
    return Math.round(monthlyPrice * (1 - discount) * m * 100) / 100;
  },

  // ── Validações de Cartão ───────────────────────────────────
  validateCard(card: CreditCardData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const cleaned = card.number.replace(/\D/g, '');

    if (!card.holderName || card.holderName.trim().length < 3) {
      errors.push('Nome do titular é obrigatório (mín. 3 caracteres).');
    }
    if (!luhnCheck(cleaned)) {
      errors.push('Número do cartão inválido.');
    }
    const month = parseInt(card.expMonth, 10);
    const year = parseInt(card.expYear, 10);
    if (month < 1 || month > 12) {
      errors.push('Mês de validade inválido.');
    }
    const now = new Date();
    const fullYear = year < 100 ? 2000 + year : year;
    if (fullYear < now.getFullYear() || (fullYear === now.getFullYear() && month < now.getMonth() + 1)) {
      errors.push('Cartão expirado.');
    }
    if (card.cvv.replace(/\D/g, '').length < 3) {
      errors.push('CVV inválido.');
    }

    return { valid: errors.length === 0, errors };
  },

  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  maskCardNumber,
  luhnCheck,

  // ── Criar Intenção de Pagamento (mock — pronto para gateway) ──
  async createPaymentIntent(data: {
    clinicId: string;
    planId: string;
    method: PaymentMethod;
    amount: number;
    installments: number;
    customerEmail: string;
    customerDocument: string;
    customerName: string;
    cardData?: CreditCardData;
  }): Promise<PaymentIntent> {

    const id = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const installmentAmount = Math.ceil(Math.round(data.amount * 100) / data.installments);

    // ────────────────────────────────────────────────────────
    // TODO: INTEGRAR COM GATEWAY REAL
    // Sugestões: Stripe, MercadoPago, Asaas, PagSeguro
    //
    // Para PIX:
    //   const pixResponse = await gateway.createPixCharge({...});
    //   pixData = { qrCode: pixResponse.qr, copyPaste: pixResponse.copy_paste };
    //
    // Para Cartão:
    //   const cardResponse = await gateway.createCardCharge({
    //     token: tokenizedCard,
    //     installments: data.installments,
    //     ...
    //   });
    // ────────────────────────────────────────────────────────

    const intent: PaymentIntent = {
      id,
      clinicId: data.clinicId,
      planId: data.planId,
      method: data.method,
      status: data.method === 'PIX' ? 'PENDING' : 'PROCESSING',
      amount: Math.round(data.amount * 100),
      installments: data.installments,
      installmentAmount,
      currency: 'BRL',
      customerEmail: data.customerEmail,
      customerDocument: data.customerDocument,
      customerName: data.customerName,
      createdAt: new Date().toISOString(),
      metadata: { source: 'landing_page_checkout' },
    };

    // Simula PIX
    if (data.method === 'PIX') {
      intent.pixData = {
        copyPaste: `00020126580014br.gov.bcb.pix0136${id}520400005303986540${data.amount.toFixed(2)}5802BR`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
        qrCodeBase64: '', // Gateway retornaria o QR code real
      };
    }

    // Simula aprovação de cartão
    if (data.method === 'CREDIT_CARD' && data.cardData) {
      intent.cardLastFour = data.cardData.number.replace(/\D/g, '').slice(-4);
      intent.cardBrand = detectCardBrand(data.cardData.number);
      // Em produção: tokenizar cartão e enviar para gateway
      // Simulação: aprovação automática
      intent.status = 'APPROVED';
      intent.paidAt = new Date().toISOString();
      intent.gatewayTransactionId = `txn_${Date.now()}`;
    }

    console.log(`[Payment] Intent criada: ${id} | ${data.method} | R$ ${data.amount} | ${data.installments}x`);
    return intent;
  },

  // ── Consultar Status (mock) ────────────────────────────────
  async checkPaymentStatus(intentId: string): Promise<PaymentStatus> {
    // TODO: Consultar gateway real
    console.log(`[Payment] Verificando status de ${intentId}`);
    return 'APPROVED';
  },

  // ── Formatar valores ───────────────────────────────────────
  formatCurrency(valueReais: number): string {
    return `R$ ${valueReais.toFixed(2).replace('.', ',')}`;
  },

  formatCurrencyCents(valueCents: number): string {
    return `R$ ${(valueCents / 100).toFixed(2).replace('.', ',')}`;
  },
};
