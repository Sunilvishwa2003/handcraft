import express from 'express';
import Product from '../models/Product';
import asyncHandler from '../utils/asyncHandler';

const router = express.Router();

const inquiryTypeLabels: Record<string, string> = {
  'request-quotation': 'Request quotation',
  'custom-design-inquiry': 'Custom design inquiry',
  'bulk-order-inquiry': 'Bulk order inquiry',
  'material-consultation': 'Material consultation',
  'shipping-inquiry': 'Shipping inquiry',
};

const sanitize = (value: unknown) => String(value || '').trim();

router.post(
  '/inquiry-preview',
  asyncHandler(async (req, res) => {
    const productId = sanitize(req.body?.productId);
    const inquiryType = sanitize(req.body?.inquiryType) || 'request-quotation';
    const product = productId ? await Product.findById(productId).select('name').lean() : null;

    const lines = [
      'Hello, I want to discuss a handcrafted customization request.',
      '',
      `Inquiry type: ${inquiryTypeLabels[inquiryType] || inquiryTypeLabels['request-quotation']}`,
    ];

    if (product?.name) {
      lines.push(`Product: ${product.name}`);
    }

    const customization = req.body?.customization || {};
    const material = sanitize(customization.material || req.body?.material);
    const size = sanitize(customization.size || req.body?.size);
    const finish = sanitize(customization.finish || req.body?.finish);
    const texture = sanitize(customization.texture || req.body?.texture);
    const style = sanitize(customization.style || req.body?.style);
    const engravingText = sanitize(customization.engravingText || req.body?.engravingText);
    const customNotes = sanitize(customization.customNotes || req.body?.customNotes || req.body?.notes);
    const budget = sanitize(req.body?.budget);

    if (material) {
      lines.push(`Material: ${material}`);
    }
    if (size) {
      lines.push(`Size: ${size}`);
    }
    if (finish) {
      lines.push(`Finish: ${finish}`);
    }
    if (texture) {
      lines.push(`Texture: ${texture}`);
    }
    if (style) {
      lines.push(`Style: ${style}`);
    }
    if (engravingText) {
      lines.push(`Engraving: ${engravingText}`);
    }
    if (budget) {
      lines.push(`Budget: ${budget}`);
    }
    if (customNotes) {
      lines.push(`Notes: ${customNotes}`);
    }

    lines.push('', 'Please share pricing, craftsmanship details, and the next steps.');

    res.json({
      inquiryType,
      message: lines.join('\n'),
      phoneNumber: sanitize(process.env.WHATSAPP_PHONE_NUMBER || ''),
    });
  })
);

export default router;
