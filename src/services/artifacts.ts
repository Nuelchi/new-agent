import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { v4 as uuidv4 } from "uuid";

const ART_DIR = path.join(process.cwd(), "artifacts");

function ensureDir(p: string) {
	if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export type Artifact = {
	id: string;
	dir: string;
	files: Array<{ name: string; path: string }>;
	zipPath: string;
};

export function saveCodeAsArtifact(strategyName: string, code: string, ext: string): Artifact {
	ensureDir(ART_DIR);
	const id = uuidv4();
	const dir = path.join(ART_DIR, id);
	ensureDir(dir);
    const safeName = (strategyName || "Strategy").replace(/[^a-z0-9_-]+/gi, "_");
	const fileName = `${safeName}.${ext}`;
	const filePath = path.join(dir, fileName);
	fs.writeFileSync(filePath, code, "utf8");

	const zip = new AdmZip();
	zip.addLocalFile(filePath);
	const zipPath = path.join(dir, `${safeName}.zip`);
	zip.writeZip(zipPath);

	return { id, dir, files: [{ name: fileName, path: filePath }], zipPath };
}

export function getArtifactZipPath(id: string): string | null {
	const dir = path.join(ART_DIR, id);
    const matches = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.zip')) : [];
    const file = matches.length > 0 ? matches[0] : undefined;
    if (!file) return null;
    return path.join(dir, file);
}

