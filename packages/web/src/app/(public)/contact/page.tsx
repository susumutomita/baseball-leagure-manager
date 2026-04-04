"use client";

import { useState } from "react";
import styles from "../terms/page.module.css";
import contactStyles from "./page.module.css";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "お名前を入力してください";
    if (!email.trim()) {
      newErrors.email = "メールアドレスを入力してください";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "有効なメールアドレスを入力してください";
    }
    if (!message.trim())
      newErrors.message = "お問い合わせ内容を入力してください";
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>お問い合わせ</h1>
        <section className={styles.section}>
          <h2>送信完了</h2>
          <p>
            お問い合わせいただきありがとうございます。内容を確認の上、ご連絡差し上げます。
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>お問い合わせ</h1>
      <p className={styles.updated}>
        ご質問・ご要望がございましたら、以下のフォームよりお気軽にお問い合わせください。
      </p>

      <section className={styles.section}>
        <form onSubmit={handleSubmit} noValidate>
          <div className={contactStyles.formField}>
            <label htmlFor="contact-name" className={contactStyles.label}>
              お名前 <span className={contactStyles.required}>*</span>
            </label>
            <input
              id="contact-name"
              type="text"
              className={contactStyles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="山田 太郎"
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" className={contactStyles.error} role="alert">
                {errors.name}
              </p>
            )}
          </div>

          <div className={contactStyles.formField}>
            <label htmlFor="contact-email" className={contactStyles.label}>
              メールアドレス <span className={contactStyles.required}>*</span>
            </label>
            <input
              id="contact-email"
              type="email"
              className={contactStyles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              aria-required="true"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && (
              <p id="email-error" className={contactStyles.error} role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div className={contactStyles.formField}>
            <label htmlFor="contact-message" className={contactStyles.label}>
              お問い合わせ内容 <span className={contactStyles.required}>*</span>
            </label>
            <textarea
              id="contact-message"
              className={contactStyles.textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="お問い合わせ内容をご記入ください"
              rows={6}
              aria-required="true"
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "message-error" : undefined}
            />
            {errors.message && (
              <p
                id="message-error"
                className={contactStyles.error}
                role="alert"
              >
                {errors.message}
              </p>
            )}
          </div>

          <button type="submit" className={contactStyles.submitButton}>
            送信する
          </button>
        </form>
      </section>
    </div>
  );
}
