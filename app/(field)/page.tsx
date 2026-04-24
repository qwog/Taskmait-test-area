import { BigButton } from "@/components/field/BigButton";

export default function FieldHome() {
  return (
    <div className="flex flex-col gap-4">
      <BigButton href="/pours/new?mode=field" tone="green">
        Start New Pour
      </BigButton>
      <BigButton href="/field/active" tone="blue">
        Log Current Pour
      </BigButton>
      <BigButton href="/field/curing" tone="amber">
        Check Cure Status
      </BigButton>
    </div>
  );
}
