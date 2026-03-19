/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (hackathon: { name: string; participants: string[] }) => void;
}

export default function CreateHack({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const handleCSV = (file: File) => {
    setFileName(file.name);

    Papa.parse(file, {
      complete: (result) => {
        const names = result.data
          .map((row: any) => row[0])
          .filter(Boolean);
        setParticipants(names);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      handleCSV(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = () => {
    onCreate({ name, participants });
    setName("");
    setParticipants([]);
    setFileName("");
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          
          className="w-105 bg-card border border-border rounded-2xl p-6 space-y-6 shadow-xl"
        >
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Create Hackathon
            </h2>
            <p className="text-sm text-muted-foreground">
              Upload a CSV file to import participants.
            </p>
          </div>

          {/* Hackathon Name */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Hackathon Name
            </label>
            <input
              type="text"
              placeholder="e.g. HackSelect AI 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-border bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {/* CSV Drop Area */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInput.current?.click()}
            className="cursor-pointer border border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 hover:border-accent/60 hover:bg-accent/5 transition"
          >
            <UploadCloud className="w-7 h-7 text-muted-foreground" />

            <div className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">
                Click to upload
              </span>{" "}
              or drag & drop
            </div>

            <p className="text-xs text-muted-foreground">CSV files only</p>

            <input
              ref={fileInput}
              type="file"
              accept=".csv"
              hidden
              onChange={(e) =>
                e.target.files && handleCSV(e.target.files[0])
              }
            />
          </div>

          {/* File Preview */}
          {fileName && (
            <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-lg p-3">
              <FileText className="w-4 h-4 text-accent" />
              <div className="flex flex-col text-sm">
                <span className="font-medium text-foreground">
                  {fileName}
                </span>
                <span className="text-muted-foreground text-xs">
                  {participants.length} participants loaded
                </span>
              </div>
            </div>
          )}

          {/* Participants Preview */}
          {participants.length > 0 && (
            <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-3 text-sm space-y-1">
              {participants.slice(0, 8).map((p, i) => (
                <div key={i} className="text-muted-foreground">
                  {p}
                </div>
              ))}
              {participants.length > 8 && (
                <div className="text-xs text-muted-foreground">
                  + {participants.length - 8} more
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>

            <Button
              variant="hero"
              disabled={!name}
              onClick={handleSubmit}
            >
              Create Hackathon
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );}