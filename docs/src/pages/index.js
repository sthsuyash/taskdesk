import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const features = [
  {
    title: 'Simple Tasks',
    description: 'Create and manage tasks with a clean, focused interface designed for productivity.',
  },
  {
    title: 'Session Recording',
    description: 'Automatic session capture using rrweb - every click, scroll, and interaction.',
  },
  {
    title: 'Live Support',
    description: 'Watch sessions in real-time with WebSocket streaming for instant help.',
  },
];

function Feature({ title, description }) {
  return (
    <div className="col col--4 margin-bottom--lg">
      <div className={styles.featureCard}>
        <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </div>
  );
}

function Hero() {
  const { siteConfig } = useDocusaurusContext();
  const appUrl = siteConfig.customFields?.appUrl || 'http://localhost:5174';
  
  return (
    <header className={styles.hero}>
      <div className="container">
        <div className={styles.heroContent}>
          <Heading as="h1" className={styles.heroTitle}>TaskDesk</Heading>
          <p className={styles.heroSubtitle}>Task management with session replay</p>
          <p className={styles.heroDescription}>
            One focused app, one admin console, unified session events.
            Built on the popular rrweb library.
          </p>
          <div className={styles.heroActions}>
            <Link className="button button--primary button--lg" to="/docs/getting-started">
              Get Started
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/api">
              API Reference
            </Link>
            <a className="button button--ghost button--lg" href={appUrl}>
              Open App →
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

function Features() {
  return (
    <section className={styles.section}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>Features</Heading>
        <div className="row">
          {features.map((feature, idx) => (
            <Feature key={idx} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="" description={siteConfig.tagline}>
      <main className={styles.homeMain}>
        <Hero />
        <Features />
      </main>
    </Layout>
  );
}