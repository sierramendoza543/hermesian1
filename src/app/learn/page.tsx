import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import DisclosureCard from '@/components/Learn/DisclosureCard';

export const metadata = {
  title: 'Learn | Hermesian',
  description: 'Media Literacy 101: Understanding bias, fallacies, and emotional appeals',
};

export default function LearnPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 md:px-16">
        {/* Hero Section */}
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">Media Literacy 101</h1>
          <p className="text-lg text-gray-600 mb-8">
            Learn how to spot bias, logical fallacies, and emotional manipulation in the news.
          </p>
          <hr className="border-t-2 border-accent mb-12" />
        </section>

        {/* Topic Cards */}
        <section className="space-y-8">
          <a id="bias" />
          <DisclosureCard title="What Is Bias?">
            <p className="text-base md:text-lg mb-4">
              Media bias refers to the tendency of news outlets to present information in a way that
              aligns with their own perspectives or interests. It can manifest in various forms,
              from subtle word choices to overt editorial decisions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-accent p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Left Bias</h3>
                <p className="text-sm text-gray-600">
                  "Government intervention necessary to address climate crisis"
                </p>
              </div>
              <div className="bg-accent p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Center</h3>
                <p className="text-sm text-gray-600">
                  "Experts debate climate change solutions"
                </p>
              </div>
              <div className="bg-accent p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Right Bias</h3>
                <p className="text-sm text-gray-600">
                  "Government overreach threatens economic growth"
                </p>
              </div>
            </div>
          </DisclosureCard>

          <a id="fallacies" />
          <DisclosureCard title="Common Logical Fallacies">
            <ul className="list-disc list-inside space-y-2 text-base md:text-lg">
              <li>
                <strong>False Dilemma:</strong> "Either we ban all fossil fuels or we destroy the planet."
                This presents only two extreme options when more exist.
              </li>
              <li>
                <strong>Appeal to Authority:</strong> "Dr. Smith says climate change isn't real, so it must be true."
                Using an authority figure's opinion as evidence.
              </li>
              <li>
                <strong>Ad Hominem:</strong> "You can't trust their research because they're funded by big oil."
                Attacking the person instead of their argument.
              </li>
              <li>
                <strong>Hasty Generalization:</strong> "One cold winter proves global warming is a hoax."
                Drawing broad conclusions from limited evidence.
              </li>
              <li>
                <strong>Post Hoc:</strong> "The stock market crashed after the new policy was announced,
                so the policy caused the crash." Assuming correlation implies causation.
              </li>
            </ul>
          </DisclosureCard>

          <a id="pathos" />
          <DisclosureCard title="Emotional Appeals (Pathos)">
            <p className="text-base md:text-lg mb-4">
              Emotional appeals, or pathos, are persuasive techniques that target our feelings rather
              than our logic. While emotions are valid, they can be manipulated to bypass critical thinking.
            </p>
            <blockquote className="border-l-4 border-primary pl-4 italic my-4">
              "If we don't act now, your children will inherit a world of chaos and destruction."
              <span className="block text-sm text-gray-500 mt-2">— Fear Appeal</span>
            </blockquote>
            <blockquote className="border-l-4 border-primary pl-4 italic my-4">
              "Join millions of happy customers who have already made the switch!"
              <span className="block text-sm text-gray-500 mt-2">— Joy Appeal</span>
            </blockquote>
            <blockquote className="border-l-4 border-primary pl-4 italic my-4">
              "They're taking away your rights and freedoms one by one!"
              <span className="block text-sm text-gray-500 mt-2">— Anger Appeal</span>
            </blockquote>
          </DisclosureCard>

          <a id="critical-reading" />
          <DisclosureCard title="How to Read Critically">
            <ol className="list-decimal list-inside space-y-4 text-base md:text-lg">
              <li>
                <strong>Question the Source:</strong> Who wrote this? What are their credentials?
                What might be their biases or motivations?
              </li>
              <li>
                <strong>Check the Evidence:</strong> Are claims supported by data? Are sources cited?
                Can you verify the information independently?
              </li>
              <li>
                <strong>Consider Multiple Perspectives:</strong> How might different groups interpret
                this information? What viewpoints are missing?
              </li>
            </ol>
          </DisclosureCard>
        </section>

        {/* Back to Home Link */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-primary hover:underline"
          >
            <ArrowLeft className="mr-2" size={16} />
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
} 