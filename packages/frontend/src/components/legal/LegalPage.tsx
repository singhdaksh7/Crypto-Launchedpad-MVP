import React from 'react';
import type { NextPage } from 'next';
import { PublicLayout } from '@/components/layout/PublicLayout';

interface LegalSection {
  title: string;
  paragraphs: string[];
}

interface LegalPageProps {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const LegalPage: NextPage<LegalPageProps> = ({ title, intro, sections }) => {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl space-y-8">
        <section className="card border-white/10 bg-gradient-to-b from-surface to-[#070A12]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-bnb-text">
            LaunchBNB Demo Policies
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-300">{intro}</p>
        </section>

        {sections.map((section) => (
          <section key={section.title} className="card space-y-4">
            <h2 className="text-xl font-semibold text-white">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-7 text-ink-300">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </PublicLayout>
  );
};
