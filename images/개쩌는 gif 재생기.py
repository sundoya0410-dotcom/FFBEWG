import os
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageTk


class GridSliceSpriteToGIFMaker:
    def __init__(self, root):
        self.root = root
        self.root.title("스프라이트 그리드 컷 → GIF 메이커 (줌 지원)")
        self.root.geometry("1380x920")
        self.root.minsize(1180, 760)

        self.image_path = None
        self.src_image = None
        self.tk_preview_image = None
        self.preview_job = None
        self.preview_frames = []
        self.preview_index = 0
        self.cell_rects = []
        self.enabled_cells = set()

        self.fit_ratio = 1.0
        self.scale_ratio = 1.0
        self.zoom_ratio = 1.0
        self.offset_x = 0
        self.offset_y = 0
        self.canvas_image_id = None

        self._build_ui()
        self._bind_events()

    def _build_ui(self):
        top = tk.Frame(self.root)
        top.pack(fill="x", padx=10, pady=10)

        tk.Button(top, text="이미지 열기", width=14, command=self.open_image).pack(side="left", padx=4)
        tk.Button(top, text="그리드 적용", width=14, command=self.rebuild_grid).pack(side="left", padx=4)
        tk.Button(top, text="전체 선택", width=12, command=self.enable_all_cells).pack(side="left", padx=4)
        tk.Button(top, text="전체 해제", width=12, command=self.disable_all_cells).pack(side="left", padx=4)
        tk.Button(top, text="확대 +", width=10, command=lambda: self.change_zoom(1.25)).pack(side="left", padx=(16, 4))
        tk.Button(top, text="축소 -", width=10, command=lambda: self.change_zoom(0.8)).pack(side="left", padx=4)
        tk.Button(top, text="화면 맞춤", width=12, command=self.reset_zoom).pack(side="left", padx=4)
        self.zoom_text_var = tk.StringVar(value="줌 100%")
        tk.Label(top, textvariable=self.zoom_text_var, width=10, anchor="w", fg="#1565C0").pack(side="left", padx=(6, 10))
        tk.Button(top, text="프리뷰 생성", width=14, command=self.make_preview).pack(side="left", padx=4)
        tk.Button(top, text="GIF 저장", width=14, command=self.save_gif).pack(side="left", padx=4)

        self.status_var = tk.StringVar(value="이미지를 열어주세요.")
        tk.Label(top, textvariable=self.status_var, anchor="w", fg="#1565C0").pack(side="left", padx=12)

        body = tk.Frame(self.root)
        body.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        left_panel = tk.Frame(body, relief="groove", bd=2)
        left_panel.pack(side="left", fill="y", padx=(0, 10))
        self._build_controls(left_panel)

        center = tk.Frame(body)
        center.pack(side="left", fill="both", expand=True)

        canvas_wrap = tk.LabelFrame(center, text="스프라이트 시트")
        canvas_wrap.pack(fill="both", expand=True)

        canvas_area = tk.Frame(canvas_wrap)
        canvas_area.pack(fill="both", expand=True)

        self.canvas = tk.Canvas(canvas_area, bg="#1e1e1e", highlightthickness=0)
        self.hbar = tk.Scrollbar(canvas_area, orient="horizontal", command=self.canvas.xview)
        self.vbar = tk.Scrollbar(canvas_area, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(xscrollcommand=self.hbar.set, yscrollcommand=self.vbar.set)

        self.canvas.grid(row=0, column=0, sticky="nsew")
        self.vbar.grid(row=0, column=1, sticky="ns")
        self.hbar.grid(row=1, column=0, sticky="ew")
        canvas_area.grid_rowconfigure(0, weight=1)
        canvas_area.grid_columnconfigure(0, weight=1)

        right_panel = tk.Frame(body, width=300)
        right_panel.pack(side="left", fill="y", padx=(10, 0))
        right_panel.pack_propagate(False)
        self._build_right_panel(right_panel)

    def _build_controls(self, parent):
        pad = {"padx": 10, "pady": 4}

        info = tk.LabelFrame(parent, text="1) 재단 방식", padx=8, pady=8)
        info.pack(fill="x", padx=8, pady=(8, 6))
        tk.Label(info, text="이미지를 케이크 썰듯이 일정한 칸으로 자릅니다.", fg="#1565C0").pack(anchor="w")
        tk.Label(info, text="재생 순서: 왼쪽 → 오른쪽, 그 다음 위 → 아래").pack(anchor="w", pady=(4, 0))
        tk.Label(info, text="칸 클릭: 포함/제외 토글 / 마우스 휠: 확대·축소").pack(anchor="w", pady=(4, 0))

        grid = tk.LabelFrame(parent, text="2) 그리드 설정", padx=8, pady=8)
        grid.pack(fill="x", padx=8, pady=6)

        self.cols_var = tk.IntVar(value=8)
        self.rows_var = tk.IntVar(value=8)
        self.margin_x_var = tk.IntVar(value=0)
        self.margin_y_var = tk.IntVar(value=0)
        self.gap_x_var = tk.IntVar(value=0)
        self.gap_y_var = tk.IntVar(value=0)

        self._spin_row(grid, "열 수", self.cols_var, 1, 100)
        self._spin_row(grid, "행 수", self.rows_var, 1, 100)
        self._spin_row(grid, "좌우 여백", self.margin_x_var, 0, 500)
        self._spin_row(grid, "상하 여백", self.margin_y_var, 0, 500)
        self._spin_row(grid, "가로 간격", self.gap_x_var, 0, 200)
        self._spin_row(grid, "세로 간격", self.gap_y_var, 0, 200)

        seq = tk.LabelFrame(parent, text="3) 재생 범위", padx=8, pady=8)
        seq.pack(fill="x", padx=8, pady=6)

        self.start_index_var = tk.IntVar(value=1)
        self.frame_count_var = tk.IntVar(value=0)
        self.duration_var = tk.IntVar(value=80)
        self.scale_var = tk.IntVar(value=100)
        self.loop_var = tk.IntVar(value=0)
        self.bg_pick_var = tk.StringVar(value="원본 그대로")

        self._spin_row(seq, "시작 칸 번호", self.start_index_var, 1, 10000)
        self._spin_row(seq, "사용 프레임 수 (0=끝까지)", self.frame_count_var, 0, 10000)
        self._spin_row(seq, "프레임 속도(ms)", self.duration_var, 10, 5000)
        self._spin_row(seq, "저장 배율(%)", self.scale_var, 10, 800)
        self._spin_row(seq, "루프(0=무한)", self.loop_var, 0, 999)

        bg_row = tk.Frame(seq)
        bg_row.pack(fill="x", **pad)
        tk.Label(bg_row, text="배경 처리", width=16, anchor="w").pack(side="left")
        ttk.Combobox(
            bg_row,
            textvariable=self.bg_pick_var,
            state="readonly",
            values=["원본 그대로", "좌상단 색 투명화"],
            width=18,
        ).pack(side="left", fill="x", expand=True)

        help_box = tk.LabelFrame(parent, text="4) 빠른 사용법", padx=8, pady=8)
        help_box.pack(fill="x", padx=8, pady=6)
        instructions = (
            "1. 이미지 열기\n"
            "2. 열 수 / 행 수 입력\n"
            "3. 그리드 적용\n"
            "4. 확대해서 칸 상태 확인\n"
            "5. 빈 칸은 클릭해서 제외\n"
            "6. 프리뷰 생성 → GIF 저장"
        )
        tk.Label(help_box, text=instructions, justify="left").pack(anchor="w")

        self.summary_var = tk.StringVar(value="칸 정보 없음")
        tk.Label(parent, textvariable=self.summary_var, justify="left", fg="#444").pack(anchor="w", padx=14, pady=(6, 10))

    def _build_right_panel(self, parent):
        preview_box = tk.LabelFrame(parent, text="GIF 프리뷰")
        preview_box.pack(fill="both", expand=True)

        self.preview_canvas = tk.Canvas(preview_box, bg="#111111", width=280, height=280, highlightthickness=0)
        self.preview_canvas.pack(fill="both", expand=True, padx=8, pady=8)

        self.preview_info_var = tk.StringVar(value="프리뷰 없음")
        tk.Label(preview_box, textvariable=self.preview_info_var, anchor="w", justify="left").pack(fill="x", padx=8, pady=(0, 8))

        cell_box = tk.LabelFrame(parent, text="선택 상태")
        cell_box.pack(fill="x", pady=(10, 0))
        self.selected_info_var = tk.StringVar(value="칸을 클릭하면 포함/제외됩니다.")
        tk.Label(cell_box, textvariable=self.selected_info_var, justify="left", anchor="w").pack(fill="x", padx=8, pady=8)

    def _spin_row(self, parent, label, variable, minv, maxv):
        row = tk.Frame(parent)
        row.pack(fill="x", padx=4, pady=4)
        tk.Label(row, text=label, width=16, anchor="w").pack(side="left")
        spin = tk.Spinbox(row, from_=minv, to=maxv, textvariable=variable, width=10, command=self.on_setting_changed)
        spin.pack(side="left")
        spin.bind("<KeyRelease>", lambda e: self.on_setting_changed())
        spin.bind("<<Increment>>", lambda e: self.on_setting_changed())
        spin.bind("<<Decrement>>", lambda e: self.on_setting_changed())

    def _bind_events(self):
        self.canvas.bind("<Configure>", lambda e: self.redraw_canvas())
        self.canvas.bind("<Button-1>", self.on_canvas_click)
        self.canvas.bind("<MouseWheel>", self.on_mousewheel)
        self.canvas.bind("<Button-4>", lambda e: self.change_zoom(1.1, event=e))
        self.canvas.bind("<Button-5>", lambda e: self.change_zoom(0.9, event=e))
        self.root.bind("<Left>", lambda e: self.shift_start(-1))
        self.root.bind("<Right>", lambda e: self.shift_start(1))
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

    def on_close(self):
        self.stop_preview()
        self.root.destroy()

    def on_setting_changed(self):
        if self.src_image is not None:
            self.rebuild_grid(redraw_only=True)

    def open_image(self):
        path = filedialog.askopenfilename(
            title="스프라이트 시트 이미지 선택",
            filetypes=[("Image Files", "*.png;*.jpg;*.jpeg;*.bmp;*.webp"), ("All Files", "*.*")],
        )
        if not path:
            return

        try:
            img = Image.open(path).convert("RGBA")
        except Exception as e:
            messagebox.showerror("오류", f"이미지를 열 수 없습니다.\n{e}")
            return

        self.stop_preview()
        self.image_path = path
        self.src_image = img
        self.enabled_cells.clear()
        self.zoom_ratio = 1.0
        self.status_var.set(f"불러옴: {os.path.basename(path)}")
        self.rebuild_grid(auto_guess=True)

    def auto_guess_grid(self):
        if self.src_image is None:
            return
        w, h = self.src_image.size

        candidates = [4, 5, 6, 7, 8, 9, 10, 12]
        cols = min(candidates, key=lambda c: abs((w / c) - (h / max(1, c)))) if w > h else 6
        rows = max(1, round(h / max(1, w / max(cols, 1))))

        cols = max(1, min(cols, 30))
        rows = max(1, min(rows, 30))

        self.cols_var.set(cols)
        self.rows_var.set(rows)

    def rebuild_grid(self, auto_guess=False, redraw_only=False):
        if self.src_image is None:
            return

        if auto_guess:
            self.auto_guess_grid()

        try:
            cols = max(1, int(self.cols_var.get()))
            rows = max(1, int(self.rows_var.get()))
            margin_x = max(0, int(self.margin_x_var.get()))
            margin_y = max(0, int(self.margin_y_var.get()))
            gap_x = max(0, int(self.gap_x_var.get()))
            gap_y = max(0, int(self.gap_y_var.get()))
        except Exception:
            messagebox.showerror("오류", "행/열/여백/간격 값이 잘못되었습니다.")
            return

        w, h = self.src_image.size
        usable_w = w - (margin_x * 2) - gap_x * (cols - 1)
        usable_h = h - (margin_y * 2) - gap_y * (rows - 1)
        if usable_w <= 0 or usable_h <= 0:
            messagebox.showerror("오류", "여백 또는 간격 값이 너무 큽니다.")
            return

        cell_w = usable_w / cols
        cell_h = usable_h / rows
        if cell_w < 1 or cell_h < 1:
            messagebox.showerror("오류", "계산된 칸 크기가 너무 작습니다.")
            return

        self.cell_rects = []
        index = 1
        for r in range(rows):
            for c in range(cols):
                x1 = margin_x + c * (cell_w + gap_x)
                y1 = margin_y + r * (cell_h + gap_y)
                x2 = x1 + cell_w
                y2 = y1 + cell_h
                self.cell_rects.append((index, x1, y1, x2, y2))
                index += 1

        if not redraw_only or not self.enabled_cells:
            self.enable_all_cells()
        else:
            valid_indices = {idx for idx, *_ in self.cell_rects}
            self.enabled_cells = {idx for idx in self.enabled_cells if idx in valid_indices}
            self.redraw_canvas()
            self.update_summary()

    def enable_all_cells(self):
        self.enabled_cells = {idx for idx, *_ in self.cell_rects}
        self.redraw_canvas()
        self.update_summary()

    def disable_all_cells(self):
        self.enabled_cells = set()
        self.redraw_canvas()
        self.update_summary()

    def update_summary(self):
        total = len(self.cell_rects)
        enabled = len(self.enabled_cells)
        if not self.src_image:
            self.summary_var.set("칸 정보 없음")
            return

        if self.cell_rects:
            _, x1, y1, x2, y2 = self.cell_rects[0]
            cell_w = int(round(x2 - x1))
            cell_h = int(round(y2 - y1))
            summary = (
                f"원본 크기: {self.src_image.size[0]} x {self.src_image.size[1]}\n"
                f"칸 크기: {cell_w} x {cell_h}\n"
                f"전체 칸: {total}개\n"
                f"포함 칸: {enabled}개\n"
                f"현재 줌: {int(round(self.zoom_ratio * 100))}%"
            )
        else:
            summary = "칸 정보 없음"
        self.summary_var.set(summary)
        self.zoom_text_var.set(f"줌 {int(round(self.zoom_ratio * 100))}%")

    def redraw_canvas(self):
        self.canvas.delete("all")
        if self.src_image is None:
            self.canvas.configure(scrollregion=(0, 0, 1, 1))
            return

        canvas_w = max(1, self.canvas.winfo_width())
        canvas_h = max(1, self.canvas.winfo_height())
        img_w, img_h = self.src_image.size

        self.fit_ratio = min(canvas_w / img_w, canvas_h / img_h)
        if self.fit_ratio <= 0:
            self.fit_ratio = 1.0

        self.scale_ratio = max(0.05, self.fit_ratio * self.zoom_ratio)
        draw_w = max(1, int(round(img_w * self.scale_ratio)))
        draw_h = max(1, int(round(img_h * self.scale_ratio)))
        resized = self.src_image.resize((draw_w, draw_h), Image.Resampling.NEAREST)
        self.tk_preview_image = ImageTk.PhotoImage(resized)

        if draw_w < canvas_w:
            self.offset_x = (canvas_w - draw_w) // 2
        else:
            self.offset_x = 0
        if draw_h < canvas_h:
            self.offset_y = (canvas_h - draw_h) // 2
        else:
            self.offset_y = 0

        self.canvas_image_id = self.canvas.create_image(self.offset_x, self.offset_y, image=self.tk_preview_image, anchor="nw")

        for idx, x1, y1, x2, y2 in self.cell_rects:
            sx1 = self.offset_x + x1 * self.scale_ratio
            sy1 = self.offset_y + y1 * self.scale_ratio
            sx2 = self.offset_x + x2 * self.scale_ratio
            sy2 = self.offset_y + y2 * self.scale_ratio

            active = idx in self.enabled_cells
            color = "#4CAF50" if active else "#F44336"
            width = 2 if active else 1
            self.canvas.create_rectangle(sx1, sy1, sx2, sy2, outline=color, width=width)
            self.canvas.create_text(sx1 + 6, sy1 + 6, text=str(idx), fill=color, anchor="nw", font=("Arial", 10, "bold"))

        region_w = max(canvas_w, self.offset_x + draw_w + 10)
        region_h = max(canvas_h, self.offset_y + draw_h + 10)
        self.canvas.configure(scrollregion=(0, 0, region_w, region_h))
        self.update_summary()

    def on_canvas_click(self, event):
        if not self.src_image or not self.cell_rects:
            return

        cx = self.canvas.canvasx(event.x)
        cy = self.canvas.canvasy(event.y)
        ix = (cx - self.offset_x) / self.scale_ratio
        iy = (cy - self.offset_y) / self.scale_ratio

        for idx, x1, y1, x2, y2 in self.cell_rects:
            if x1 <= ix <= x2 and y1 <= iy <= y2:
                if idx in self.enabled_cells:
                    self.enabled_cells.remove(idx)
                    state = "제외"
                else:
                    self.enabled_cells.add(idx)
                    state = "포함"
                self.selected_info_var.set(f"칸 {idx}: {state}\n클릭으로 포함/제외를 바꿀 수 있습니다.")
                self.redraw_canvas()
                return

    def on_mousewheel(self, event):
        if event.delta > 0:
            self.change_zoom(1.1, event=event)
        else:
            self.change_zoom(0.9, event=event)

    def change_zoom(self, factor, event=None):
        if self.src_image is None:
            return

        old_zoom = self.zoom_ratio
        new_zoom = max(0.2, min(20.0, old_zoom * factor))
        if abs(new_zoom - old_zoom) < 1e-6:
            return
        self.zoom_ratio = new_zoom

        if event is not None:
            old_cx = self.canvas.canvasx(event.x)
            old_cy = self.canvas.canvasy(event.y)
        else:
            old_cx = self.canvas.canvasx(self.canvas.winfo_width() / 2)
            old_cy = self.canvas.canvasy(self.canvas.winfo_height() / 2)

        img_x = (old_cx - self.offset_x) / max(self.scale_ratio, 1e-9)
        img_y = (old_cy - self.offset_y) / max(self.scale_ratio, 1e-9)

        self.redraw_canvas()
        self.root.update_idletasks()

        new_canvas_x = self.offset_x + img_x * self.scale_ratio
        new_canvas_y = self.offset_y + img_y * self.scale_ratio
        target_left = new_canvas_x - self.canvas.winfo_width() / 2
        target_top = new_canvas_y - self.canvas.winfo_height() / 2
        self.scroll_to(target_left, target_top)
        self.status_var.set(f"줌 변경: {int(round(self.zoom_ratio * 100))}%")

    def reset_zoom(self):
        self.zoom_ratio = 1.0
        self.redraw_canvas()
        self.canvas.xview_moveto(0)
        self.canvas.yview_moveto(0)
        self.status_var.set("화면 맞춤")

    def scroll_to(self, left, top):
        region = self.canvas.cget("scrollregion")
        if not region:
            return
        x0, y0, x1, y1 = map(float, region.split())
        total_w = max(1.0, x1 - x0)
        total_h = max(1.0, y1 - y0)
        view_w = self.canvas.winfo_width()
        view_h = self.canvas.winfo_height()

        max_left = max(0.0, total_w - view_w)
        max_top = max(0.0, total_h - view_h)
        left = max(0.0, min(max_left, left))
        top = max(0.0, min(max_top, top))

        self.canvas.xview_moveto(left / total_w)
        self.canvas.yview_moveto(top / total_h)

    def shift_start(self, delta):
        if not self.cell_rects:
            return
        max_index = len(self.cell_rects)
        new_value = max(1, min(max_index, int(self.start_index_var.get()) + delta))
        self.start_index_var.set(new_value)
        self.status_var.set(f"시작 칸 번호: {new_value}")

    def build_frame_images(self):
        if self.src_image is None or not self.cell_rects:
            raise ValueError("이미지 또는 그리드가 없습니다.")

        start_index = max(1, int(self.start_index_var.get()))
        frame_count = max(0, int(self.frame_count_var.get()))
        scale_percent = max(1, int(self.scale_var.get()))
        use_transparent = self.bg_pick_var.get() == "좌상단 색 투명화"

        ordered_cells = [cell for cell in self.cell_rects if cell[0] in self.enabled_cells and cell[0] >= start_index]
        ordered_cells.sort(key=lambda x: x[0])
        if frame_count > 0:
            ordered_cells = ordered_cells[:frame_count]

        if not ordered_cells:
            raise ValueError("사용할 칸이 없습니다. 포함된 칸과 시작 번호를 확인해주세요.")

        frames = []
        for idx, x1, y1, x2, y2 in ordered_cells:
            crop = self.src_image.crop((int(round(x1)), int(round(y1)), int(round(x2)), int(round(y2)))).convert("RGBA")
            if use_transparent:
                crop = self.make_top_left_transparent(crop)
            if scale_percent != 100:
                nw = max(1, int(crop.width * scale_percent / 100))
                nh = max(1, int(crop.height * scale_percent / 100))
                crop = crop.resize((nw, nh), Image.Resampling.NEAREST)
            frames.append(crop)
        return frames

    @staticmethod
    def make_top_left_transparent(img):
        rgba = img.convert("RGBA")
        px = rgba.load()
        w, h = rgba.size
        target = px[0, 0][:3]
        out = Image.new("RGBA", (w, h))
        out_px = out.load()
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if (r, g, b) == target:
                    out_px[x, y] = (0, 0, 0, 0)
                else:
                    out_px[x, y] = (r, g, b, a)
        return out

    def make_preview(self):
        self.stop_preview()
        try:
            frames = self.build_frame_images()
            duration = max(10, int(self.duration_var.get()))
        except Exception as e:
            messagebox.showerror("오류", str(e))
            return

        self.preview_frames = []
        for frame in frames:
            fit = self.fit_frame_to_preview(frame)
            self.preview_frames.append(ImageTk.PhotoImage(fit))

        self.preview_index = 0
        self.preview_info_var.set(
            f"프레임 수: {len(frames)}개\n"
            f"속도: {duration}ms\n"
            f"정렬: 왼쪽→오른쪽, 위→아래"
        )
        self.status_var.set("프리뷰 생성 완료")
        self.animate_preview(duration)

    def fit_frame_to_preview(self, frame):
        max_w = max(1, self.preview_canvas.winfo_width() - 12)
        max_h = max(1, self.preview_canvas.winfo_height() - 12)
        ratio = min(max_w / frame.width, max_h / frame.height)
        ratio = max(ratio, 1.0)
        size = (max(1, int(frame.width * ratio)), max(1, int(frame.height * ratio)))
        return frame.resize(size, Image.Resampling.NEAREST)

    def animate_preview(self, duration):
        if not self.preview_frames:
            return
        self.preview_canvas.delete("all")
        img = self.preview_frames[self.preview_index]
        pw = self.preview_canvas.winfo_width()
        ph = self.preview_canvas.winfo_height()
        self.preview_canvas.create_image(pw // 2, ph // 2, image=img, anchor="center")
        self.preview_index = (self.preview_index + 1) % len(self.preview_frames)
        self.preview_job = self.root.after(duration, lambda: self.animate_preview(duration))

    def stop_preview(self):
        if self.preview_job is not None:
            try:
                self.root.after_cancel(self.preview_job)
            except Exception:
                pass
            self.preview_job = None

    def save_gif(self):
        try:
            frames = self.build_frame_images()
            duration = max(10, int(self.duration_var.get()))
            loop = max(0, int(self.loop_var.get()))
        except Exception as e:
            messagebox.showerror("오류", str(e))
            return

        if not frames:
            messagebox.showerror("오류", "저장할 프레임이 없습니다.")
            return

        base = os.path.splitext(os.path.basename(self.image_path or "sprite"))[0]
        default_path = base + "_grid.gif"
        save_path = filedialog.asksaveasfilename(
            title="GIF 저장",
            defaultextension=".gif",
            initialfile=default_path,
            filetypes=[("GIF Files", "*.gif")],
        )
        if not save_path:
            return

        try:
            frames[0].save(
                save_path,
                save_all=True,
                append_images=frames[1:],
                duration=duration,
                loop=loop,
                disposal=2,
                optimize=False,
            )
            self.status_var.set(f"저장 완료: {os.path.basename(save_path)}")
            messagebox.showinfo("완료", f"GIF 저장 완료\n{save_path}")
        except Exception as e:
            messagebox.showerror("오류", f"GIF 저장 실패\n{e}")


def main():
    root = tk.Tk()
    app = GridSliceSpriteToGIFMaker(root)
    root.mainloop()


if __name__ == "__main__":
    main()
