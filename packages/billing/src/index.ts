import Stripe from 'stripe';

export const createStripeClient = (): Stripe => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is required');
  }

  return new Stripe(key);
};
