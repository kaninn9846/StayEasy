import { Check, X } from "lucide-react";
import {
  validatePassword,
  getPasswordStrength,
  isPasswordValid,
  PASSWORD_RULES,
} from "../../utils/passwordValidation";

interface Props {
  password: string;
}

export default function PasswordStrengthBar({ password }: Props) {
  if (!password) return null;

  const rules = validatePassword(password);
  const strength = getPasswordStrength(rules);
  const valid = isPasswordValid(rules);

  const brandBar =
    strength === "Weak" ? "bg-[#A989C8]/40" :
    strength === "Medium" ? "bg-[#A989C8]/70" : "bg-[#A989C8]";

  const barPercent =
    strength === "Weak" ? "33%" :
    strength === "Medium" ? "66%" : "100%";

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2 p-2 rounded-lg bg-[#A989C8]/10">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${brandBar}`}
            style={{ width: barPercent }}
          />
        </div>
        <span className="text-xs font-bold text-[#A989C8]">
          {strength}
        </span>
      </div>

      {valid && (
        <p className="text-xs text-[#A989C8] font-medium flex items-center gap-1">
          <Check size={12} strokeWidth={3} />
          All requirements met
        </p>
      )}

      <ul className="space-y-0.5">
        {PASSWORD_RULES.map((rule) => {
          const met = rules[rule.key];
          return (
            <li
              key={rule.key}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                met ? "text-[#A989C8]" : "text-gray-400"
              }`}
            >
              {met ? (
                <Check size={12} strokeWidth={3} className="shrink-0" />
              ) : (
                <X size={12} strokeWidth={2} className="shrink-0" />
              )}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
