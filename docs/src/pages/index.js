import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const features = [
  {
    title: 'Record',
    description: 'Capture DOM events, user interactions, and network activity with pixel-perfect accuracy.',
  },
  {
    title: 'Replay',
    description: 'Play back recorded sessions with a full-featured player including pause, seek, and speed controls.',
  },
  {
    title: 'Live Mode',
    description: 'Stream sessions in real-time for live co-browsing and instant user support.',
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
  return (
    <header className={styles.hero}>
      <div className="container">
        <div className={styles.heroContent}>
          <Heading as="h1" className={styles.heroTitle}>rrweb</Heading>
          <p className={styles.heroSubtitle}>Session replay for the web</p>
          <p className={styles.heroDescription}>
            A complete solution for recording and replaying user interactions on your website.
            Built on the popular rrweb library.
          </p>
          <div className={styles.heroActions}>
            <Link className="button button--primary button--lg" to="/docs/getting-started">
              Get Started
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/api">
              API Reference
            </Link>
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

function CodePreview() {
  return (
    <section className={styles.sectionMuted}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>Quick Start</Heading>
        <div className={styles.codeBlock}>
          <pre>
            {`# Install dependencies
pnpm install

# Start development
pnpm dev

# Open browser
http://localhost:5173`}
          </pre>
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
        <CodePreview />
      </main>
    </Layout>
  );
}