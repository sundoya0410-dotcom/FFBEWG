import os
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from pathlib import Path


RULES = [
    ("idle", "idle.gif"),
    ("move", "move.gif"),
    ("3at", "attack.gif"),
    ("dying", "defeat.gif"),
    ("limit", "limit.gif"),
    ("magic", "casting.gif"),
    ("win", "victory.gif"),
    ("standby", "victory.gif"),
]


class RecursiveGifRenamer:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("하위 폴더 전체 GIF 이름 변경기")
        self.root.geometry("860x700")
        self.root.minsize(820, 620)

        self.folder_var = tk.StringVar()
        self.summary_var = tk.StringVar(value="폴더를 선택한 뒤 [미리보기] 또는 [이름 변경 시작]을 누르세요.")

        self._build_ui()

    def _build_ui(self):
        top = tk.Frame(self.root)
        top.pack(fill="x", padx=16, pady=(16, 8))

        tk.Label(
            top,
            text="하위 폴더까지 포함해서 GIF 파일 이름을 규칙대로 자동 변경합니다.",
            font=("맑은 고딕", 11, "bold"),
            fg="#1565C0",
        ).pack(anchor="w")
        tk.Label(
            top,
            text="규칙: idle→idle.gif / move→move.gif / 3at→attack.gif / dying→defeat.gif / limit→limit.gif / magic→casting.gif / win·standby→victory.gif",
            font=("맑은 고딕", 9),
        ).pack(anchor="w", pady=(4, 0))

        path_frame = tk.LabelFrame(self.root, text="1) 최상위 폴더 선택")
        path_frame.pack(fill="x", padx=16, pady=8)

        entry = tk.Entry(path_frame, textvariable=self.folder_var)
        entry.pack(side="left", fill="x", expand=True, padx=(10, 8), pady=10)
        tk.Button(path_frame, text="폴더 선택", width=12, command=self.select_folder).pack(side="right", padx=(0, 10), pady=10)

        rule_frame = tk.LabelFrame(self.root, text="2) 적용 규칙")
        rule_frame.pack(fill="x", padx=16, pady=8)

        rule_text = tk.Text(rule_frame, height=8, wrap="word")
        rule_text.pack(fill="x", padx=10, pady=10)
        rule_text.insert(
            "1.0",
            "- 파일명에 idle 포함 → idle.gif\n"
            "- 파일명에 move 포함 → move.gif\n"
            "- 파일명에 3at 포함 → attack.gif\n"
            "- 파일명에 dying 포함 → defeat.gif\n"
            "- 파일명에 limit 포함 → limit.gif\n"
            "- 파일명에 magic 포함 → casting.gif\n"
            "- 파일명에 win 포함 → victory.gif\n"
            "- 파일명에 standby 포함 → victory.gif\n\n"
            "※ 하위 폴더까지 전부 탐색합니다.\n"
            "※ 같은 폴더 안에서 victory.gif 등이 이미 있으면 덮어쓰지 않고 victory_2.gif 같은 식으로 번호를 붙입니다."
        )
        rule_text.config(state="disabled")

        options = tk.Frame(self.root)
        options.pack(fill="x", padx=16, pady=(0, 8))

        self.case_sensitive_var = tk.BooleanVar(value=False)
        self.preview_only_var = tk.BooleanVar(value=True)
        tk.Checkbutton(options, text="대소문자 구분", variable=self.case_sensitive_var).pack(side="left")
        tk.Checkbutton(options, text="[미리보기]를 먼저 권장", variable=self.preview_only_var, state="disabled").pack(side="left", padx=(12, 0))

        button_frame = tk.Frame(self.root)
        button_frame.pack(fill="x", padx=16, pady=8)

        tk.Button(button_frame, text="미리보기", width=14, command=self.preview_changes).pack(side="left")
        tk.Button(button_frame, text="이름 변경 시작", width=16, command=self.apply_changes, bg="#1565C0", fg="white").pack(side="left", padx=8)
        tk.Button(button_frame, text="로그 지우기", width=12, command=self.clear_log).pack(side="left")

        status_frame = tk.LabelFrame(self.root, text="3) 진행 요약")
        status_frame.pack(fill="x", padx=16, pady=8)
        tk.Label(status_frame, textvariable=self.summary_var, anchor="w", justify="left", fg="#0D47A1").pack(fill="x", padx=10, pady=10)

        progress_frame = tk.Frame(self.root)
        progress_frame.pack(fill="x", padx=16, pady=(0, 8))
        self.progress = ttk.Progressbar(progress_frame, orient="horizontal", mode="determinate")
        self.progress.pack(fill="x")

        log_frame = tk.LabelFrame(self.root, text="4) 처리 로그")
        log_frame.pack(fill="both", expand=True, padx=16, pady=(0, 16))

        self.log = tk.Text(log_frame, wrap="word")
        self.log.pack(side="left", fill="both", expand=True, padx=(10, 0), pady=10)
        scrollbar = tk.Scrollbar(log_frame, command=self.log.yview)
        scrollbar.pack(side="right", fill="y", padx=(0, 10), pady=10)
        self.log.configure(yscrollcommand=scrollbar.set)

    def select_folder(self):
        folder = filedialog.askdirectory(title="최상위 폴더를 선택하세요")
        if folder:
            self.folder_var.set(folder)
            self.summary_var.set("폴더 선택 완료. [미리보기]로 어떤 파일이 어떻게 바뀌는지 먼저 확인하세요.")

    def clear_log(self):
        self.log.delete("1.0", tk.END)
        self.summary_var.set("로그를 비웠습니다.")
        self.progress["value"] = 0
        self.progress["maximum"] = 1

    def write_log(self, text: str):
        self.log.insert(tk.END, text + "\n")
        self.log.see(tk.END)
        self.root.update_idletasks()

    def find_target_name(self, file_name: str):
        compare_name = file_name if self.case_sensitive_var.get() else file_name.lower()
        rules = RULES if self.case_sensitive_var.get() else [(k.lower(), v) for k, v in RULES]

        for keyword, target in rules:
            if keyword in compare_name:
                return target
        return None

    def gather_matches(self, folder: str):
        matches = []
        total_gifs = 0

        for current_root, _, files in os.walk(folder):
            for file_name in files:
                if not file_name.lower().endswith(".gif"):
                    continue
                total_gifs += 1
                target_name = self.find_target_name(file_name)
                if target_name is None:
                    continue
                source_path = Path(current_root) / file_name
                matches.append((source_path, target_name))

        return matches, total_gifs

    def make_unique_path(self, desired_path: Path, reserved_paths: set[Path], source_path: Path):
        if desired_path == source_path:
            return desired_path

        if desired_path not in reserved_paths and not desired_path.exists():
            return desired_path

        stem = desired_path.stem
        suffix = desired_path.suffix
        parent = desired_path.parent
        index = 2
        while True:
            candidate = parent / f"{stem}_{index}{suffix}"
            if candidate == source_path:
                return candidate
            if candidate not in reserved_paths and not candidate.exists():
                return candidate
            index += 1

    def build_plan(self, folder: str):
        matches, total_gifs = self.gather_matches(folder)
        reserved_paths = set()
        plan = []

        for source_path, target_name in sorted(matches, key=lambda x: str(x[0]).lower()):
            desired_path = source_path.with_name(target_name)
            final_path = self.make_unique_path(desired_path, reserved_paths, source_path)
            reserved_paths.add(final_path)
            plan.append((source_path, final_path))

        return plan, total_gifs

    def preview_changes(self):
        folder = self.folder_var.get().strip()
        if not folder or not os.path.isdir(folder):
            messagebox.showerror("오류", "유효한 폴더를 선택하세요.")
            return

        self.clear_log()
        plan, total_gifs = self.build_plan(folder)
        self.progress["maximum"] = max(len(plan), 1)
        self.progress["value"] = len(plan)

        if not plan:
            self.summary_var.set(f"GIF {total_gifs}개를 확인했지만, 규칙에 맞는 파일이 없습니다.")
            self.write_log("변경 대상이 없습니다.")
            return

        changed = 0
        unchanged = 0
        for i, (src, dst) in enumerate(plan, start=1):
            if src == dst:
                unchanged += 1
                self.write_log(f"[유지] {src}")
            else:
                changed += 1
                self.write_log(f"[변경 예정] {src.name}  →  {dst.name}   ({src.parent})")
            self.progress["value"] = i

        self.summary_var.set(
            f"미리보기 완료: GIF {total_gifs}개 확인 / 규칙 매칭 {len(plan)}개 / 실제 이름 변경 예정 {changed}개 / 이미 같은 이름 {unchanged}개"
        )

    def apply_changes(self):
        folder = self.folder_var.get().strip()
        if not folder or not os.path.isdir(folder):
            messagebox.showerror("오류", "유효한 폴더를 선택하세요.")
            return

        plan, total_gifs = self.build_plan(folder)
        if not plan:
            messagebox.showinfo("알림", "규칙에 맞는 GIF 파일이 없습니다.")
            return

        confirm = messagebox.askyesno(
            "확인",
            f"하위 폴더 포함 전체 탐색 결과\n\nGIF 확인: {total_gifs}개\n규칙 매칭: {len(plan)}개\n\n이름 변경을 진행할까요?"
        )
        if not confirm:
            return

        self.clear_log()
        self.progress["maximum"] = max(len(plan), 1)
        success = 0
        skipped = 0
        failed = 0

        for i, (src, dst) in enumerate(plan, start=1):
            try:
                if src == dst:
                    skipped += 1
                    self.write_log(f"[건너뜀] 이미 이름이 같음: {src}")
                else:
                    src.rename(dst)
                    success += 1
                    self.write_log(f"[완료] {src.name}  →  {dst.name}   ({dst.parent})")
            except Exception as e:
                failed += 1
                self.write_log(f"[실패] {src}  →  {dst} / {e}")
            self.progress["value"] = i

        self.summary_var.set(
            f"작업 완료: 성공 {success}개 / 건너뜀 {skipped}개 / 실패 {failed}개 / 총 GIF 확인 {total_gifs}개"
        )
        messagebox.showinfo(
            "완료",
            f"이름 변경 작업이 끝났습니다.\n\n성공: {success}개\n건너뜀: {skipped}개\n실패: {failed}개"
        )


if __name__ == "__main__":
    root = tk.Tk()
    app = RecursiveGifRenamer(root)
    root.mainloop()
