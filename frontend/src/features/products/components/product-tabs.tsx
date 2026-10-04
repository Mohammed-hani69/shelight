import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { Product } from '@/types/product'

/** تبويبات تفاصيل المنتج: الوصف، المكونات، طريقة الاستخدام، الأسئلة */
export function ProductTabs({ product }: { product: Product }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-5 md:p-8">
      <Tabs defaultValue="description">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="description">الوصف</TabsTrigger>
          <TabsTrigger value="ingredients">المكونات</TabsTrigger>
          <TabsTrigger value="how-to-use">طريقة الاستخدام</TabsTrigger>
          <TabsTrigger value="faq">الأسئلة الشائعة</TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="space-y-4 text-sm leading-relaxed text-charcoal">
          <p>{product.description}</p>
          <div>
            <h3 className="mb-2 font-display text-lg font-semibold text-plum">أهم الفوائد</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {product.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          {product.suitableFor.length > 0 && (
            <div>
              <h3 className="mb-2 font-display text-lg font-semibold text-plum">مناسب لـ</h3>
              <p className="text-muted">{product.suitableFor.join(' · ')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ingredients">
          <ul className="space-y-2.5">
            {product.ingredients.map((ingredient) => (
              <li key={ingredient} className="flex items-center gap-3 text-sm">
                <CheckDot />
                {ingredient}
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="how-to-use">
          <ol className="space-y-3">
            {product.howToUse.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </TabsContent>

        <TabsContent value="faq">
          <Accordion type="single" collapsible>
            {product.faqs.map((faq, i) => (
              <AccordionItem key={faq.question} value={`faq-${i}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CheckDot() {
  return (
    <span
      aria-hidden="true"
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
    >
      ✓
    </span>
  )
}