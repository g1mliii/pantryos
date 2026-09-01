import { useRef, useState, type ChangeEvent } from "react";
import { Button, FieldCaption } from "../ui";
import { compressRecipePhoto } from "../../domain/recipe-photo";

interface RecipePhotoFieldProps {
  onChange: (dataUrl: string | undefined) => void;
  title: string;
  value?: string;
}

export function RecipePhotoField({
  onChange,
  title,
  value,
}: RecipePhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [working, setWorking] = useState(false);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setWorking(true);
    try {
      onChange(await compressRecipePhoto(file));
      setError(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The image could not be prepared.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <section>
      <FieldCaption>Recipe photo (optional)</FieldCaption>
      <input
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => void choose(event)}
        ref={inputRef}
        type="file"
      />
      {value ? (
        <div className="border-y border-rule py-4">
          <img
            alt={`${title.trim() || "Recipe"} preview`}
            className="max-h-64 w-full object-cover"
            src={value}
          />
          <div className="mt-4 flex gap-5">
            <Button
              onClick={() => inputRef.current?.click()}
              variant="secondary"
            >
              Replace image
            </Button>
            <Button onClick={() => onChange(undefined)} variant="quiet">
              Remove image
            </Button>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-rule-warm px-5 py-5">
          <p className="font-serif text-xl">
            Add the recipe card or finished dish
          </p>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            JPG, PNG, or WebP. PantryOS compresses it and keeps it in this
            browser.
          </p>
          <Button
            className="mt-4"
            disabled={working}
            onClick={() => inputRef.current?.click()}
            variant="secondary"
          >
            {working ? "Preparing image…" : "Choose image"}
          </Button>
        </div>
      )}
      {error ? (
        <p aria-live="polite" className="mt-2 text-sm text-urgent">
          {error}
        </p>
      ) : null}
    </section>
  );
}
