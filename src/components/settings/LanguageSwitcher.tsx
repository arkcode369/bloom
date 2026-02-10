import React from 'react';
import { useTranslation } from 'react-i18next';
import { languages, LanguageCode } from '@/i18n';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (langCode: LanguageCode) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t('language.select')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('language.hint')}
        </p>
      </div>

      <RadioGroup
        value={i18n.language}
        onValueChange={(value) => handleLanguageChange(value as LanguageCode)}
        className="space-y-2"
      >
        {languages.map(({ code, name, nativeName }) => (
          <Label
            key={code}
            htmlFor={`lang-${code}`}
            className={cn(
              'flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition-all duration-200 hover:bg-accent',
              i18n.language === code ? 'border-primary bg-primary/5' : 'border-muted'
            )}
          >
            <RadioGroupItem value={code} id={`lang-${code}`} />
            <div className="flex-1">
              <span className="font-medium">{nativeName}</span>
              {nativeName !== name && (
                <span className="text-sm text-muted-foreground ml-2">
                  ({name})
                </span>
              )}
            </div>
          </Label>
        ))}
      </RadioGroup>

      <p className="text-xs text-muted-foreground">
        {t('language.saved')}
      </p>
    </div>
  );
}
