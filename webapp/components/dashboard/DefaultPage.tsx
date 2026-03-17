"use client";

import { UploadCloud } from "lucide-react";

interface Props {
  onClick: () => void;
}

export default function EmptyHackathons({ onClick }: Props) {
  return (
    <div className="w-full h-full flex justify-center items-center overflow-hidden relative">
      <div
        onClick={onClick}
        className="
          w-full max-w-xl
          border border-dashed border-border
          rounded-2xl
          p-14
          flex flex-col items-center justify-center
          text-center
          gap-4
          cursor-pointer
          transition
          hover:border-accent/70
          hover:bg-accent/5
        "
      >
        <UploadCloud className="w-10 h-10 text-muted-foreground" />

        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            No hackathons yet
          </h2>

          <p className="text-sm text-muted-foreground">
            Click or drag a CSV file here to create your first hackathon
          </p>
        </div>
      </div>
    </div>
  );
}