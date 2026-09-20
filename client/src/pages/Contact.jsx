import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MapPin, Phone, Clock, Send, BadgeCheck } from 'lucide-react';
import api from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function Contact() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const DETAILS = [
    { icon: Phone, label: t('contact.phone'), value: '+250 788 000 000', href: 'tel:+250788000000' },
    { icon: MapPin, label: t('contact.office'), value: 'KG 7 Ave, Kigali, Rwanda' },
    { icon: Clock, label: t('contact.hours'), value: t('contact.hoursValue') },
  ];

  const mutation = useMutation({
    mutationFn: () => api.post('/contact', form),
    onSuccess: () => setForm({ name: '', email: '', message: '' }),
  });

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate();
  }

  function errorText(err) {
    if (Array.isArray(err?.errors) && err.errors.length) return err.errors.map((e) => e.msg).join('. ');
    return err?.message || 'Could not send your message. Please try again.';
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 mb-2">{t('contact.eyebrow')}</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{t('contact.title')}</h1>
        <p className="text-gray-500">{t('contact.intro')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-10">
        {/* Contact details */}
        <div className="lg:col-span-2 space-y-4">
          {DETAILS.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="card p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
                {href ? (
                  <a href={href} className="text-sm font-medium text-gray-900 hover:text-brand-600">{value}</a>
                ) : (
                  <p className="text-sm font-medium text-gray-900">{value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Message form */}
        <div className="lg:col-span-3">
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">{t('contact.formTitle')}</h2>
            {mutation.isSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-brand-50 border border-brand-200 flex items-center gap-2 text-sm text-brand-800">
                <BadgeCheck className="w-4 h-4 shrink-0" />
                {t('contact.success')}
              </div>
            )}
            {mutation.isError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{errorText(mutation.error)}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('contact.name')}</label>
                  <input required value={form.name} onChange={set('name')} className="input" placeholder="Jane Uwase" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('contact.email')}</label>
                  <input type="email" required value={form.email} onChange={set('email')} className="input" placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('contact.message')}</label>
                <textarea required rows={5} value={form.message} onChange={set('message')} className="input resize-none" placeholder="How can we help?" />
              </div>
              <button type="submit" disabled={mutation.isPending} className="btn-primary justify-center">
                <Send className="w-4 h-4" />
                {mutation.isPending ? t('contact.sending') : t('contact.send')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
