<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><%= notice ? '공지 수정' : '공지 작성' %> | DAMORE ADMIN</title>
  <style>
    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #f7f7f7;
      color: #111;
      padding: 30px 20px 60px;
    }

    .wrap {
      max-width: 980px;
      margin: 0 auto;
    }

    h1 {
      margin: 0 0 24px;
      font-size: 32px;
    }

    .top-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .top-actions a {
      border: 1px solid #ddd;
      background: #fff;
      color: #111;
      padding: 10px 14px;
      border-radius: 10px;
      text-decoration: none;
      font-size: 14px;
    }

    .card {
      background: #fff;
      border: 1px solid #ececec;
      border-radius: 16px;
      padding: 22px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.04);
    }

    .field {
      margin-bottom: 18px;
    }

    .field label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 700;
    }

    .field input[type="text"],
    .field textarea,
    .field select {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #ddd;
      border-radius: 10px;
      font-size: 14px;
      background: #fff;
      outline: none;
    }

    .field textarea {
      min-height: 260px;
      resize: vertical;
      line-height: 1.7;
    }

    .row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .upload-box {
      position: relative;
      border: 1.5px dashed #cfcfcf;
      background: #fafafa;
      border-radius: 18px;
      min-height: 240px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 20px;
      cursor: pointer;
      transition: 0.2s ease;
      overflow: hidden;
    }

    .upload-box:hover {
      border-color: #999;
      background: #f3f3f3;
    }

    .upload-box.dragover {
      border-color: #111;
      background: #efefef;
    }

    .upload-box input[type="file"] {
      display: none;
    }

    .upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      color: #555;
      pointer-events: none;
    }

    .upload-placeholder svg {
      width: 96px;
      height: 96px;
      stroke: #111;
      stroke-width: 1.8;
      fill: none;
    }

    .upload-title {
      font-size: 18px;
      font-weight: 700;
      color: #111;
    }

    .upload-sub {
      font-size: 13px;
      color: #777;
      line-height: 1.5;
    }

    .preview-single {
      width: 100%;
      height: 100%;
      display: none;
      position: absolute;
      inset: 0;
      background: #fff;
    }

    .preview-single img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #f5f5f5;
    }

    .preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
      gap: 12px;
      margin-top: 14px;
    }

    .preview-item {
      position: relative;
      background: #f3f3f3;
      border-radius: 12px;
      overflow: hidden;
      aspect-ratio: 1 / 1;
      border: 1px solid #e3e3e3;
    }

    .preview-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .preview-badge {
      position: absolute;
      top: 6px;
      left: 6px;
      background: rgba(17,17,17,0.8);
      color: #fff;
      font-size: 11px;
      padding: 4px 6px;
      border-radius: 999px;
    }

    .existing-list {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
    }

    .existing-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 10px;
      background: #fafafa;
      font-size: 12px;
    }

    .submit-wrap {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .submit-wrap button,
    .submit-wrap a {
      border: 0;
      background: #111;
      color: #fff;
      padding: 13px 18px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 14px;
      text-decoration: none;
    }

    .submit-wrap a {
      background: #666;
    }

    @media (max-width: 760px) {
      .row-2 {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <%
    const safeNotice = notice || {};
  %>

  <div class="wrap">
    <h1><%= notice ? '공지 수정' : '공지 작성' %></h1>

    <div class="top-actions">
      <a href="/admin/dashboard">대시보드</a>
      <a href="/admin/notices">공지 목록</a>
    </div>

    <div class="card">
      <form action="<%= notice ? '/admin/notices/' + notice._id + '/edit' : '/admin/notices/new' %>" method="POST" enctype="multipart/form-data">
        <div class="field">
          <label for="title">제목</label>
          <input type="text" id="title" name="title" value="<%= safeNotice.title || '' %>" required />
        </div>

        <div class="row-2">
          <div class="field">
            <label for="isPinned">상단 고정</label>
            <select id="isPinned" name="isPinned">
              <option value="false" <%= !safeNotice.isPinned ? 'selected' : '' %>>일반</option>
              <option value="true" <%= safeNotice.isPinned ? 'selected' : '' %>>상단고정</option>
            </select>
          </div>

          <div class="field">
            <label for="isVisible">노출 여부</label>
            <select id="isVisible" name="isVisible">
              <option value="true" <%= safeNotice.isVisible !== false ? 'selected' : '' %>>노출</option>
              <option value="false" <%= safeNotice.isVisible === false ? 'selected' : '' %>>숨김</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label style="display:block;font-weight:700;margin-bottom:10px;">대표 이미지</label>

          <label class="upload-box" id="mainUploadBox">
            <input type="file" id="mainImageInput" name="imageFile" accept="image/*" />
            <div class="upload-placeholder" id="mainPlaceholder">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 19h12a4 4 0 0 0 .5-8A6.5 6.5 0 0 0 6.2 8.3 4.5 4.5 0 0 0 6 19Z"></path>
                <path d="M12 16V9"></path>
                <path d="m9 12 3-3 3 3"></path>
              </svg>
              <div class="upload-title">대표 이미지 업로드</div>
              <div class="upload-sub">클릭하거나 파일을 드래그하세요</div>
            </div>
            <div class="preview-single" id="mainPreview"></div>
          </label>

          <% if (safeNotice.image) { %>
            <input type="hidden" name="existingImage" value="<%= safeNotice.image %>">
            <div class="existing-list">
              <span class="existing-chip">기존 대표 이미지 유지</span>
            </div>
          <% } %>
        </div>

        <div class="field">
          <label style="display:block;font-weight:700;margin-bottom:10px;">본문 이미지</label>

          <label class="upload-box" id="detailUploadBox" style="min-height:180px;">
            <input type="file" id="detailImagesInput" name="detailImageFiles" accept="image/*" multiple />
            <div class="upload-placeholder">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 19h12a4 4 0 0 0 .5-8A6.5 6.5 0 0 0 6.2 8.3 4.5 4.5 0 0 0 6 19Z"></path>
                <path d="M12 16V9"></path>
                <path d="m9 12 3-3 3 3"></path>
              </svg>
              <div class="upload-title">본문 이미지 여러 장 업로드</div>
              <div class="upload-sub">공지 본문 아래 순서대로 노출됨</div>
            </div>
          </label>

          <div class="preview-grid" id="detailPreviewGrid"></div>

          <% (safeNotice.detailImages || []).forEach((img) => { %>
            <input type="hidden" name="existingDetailImages" value="<%= img %>">
          <% }) %>
        </div>

        <div class="field">
          <label for="content">내용</label>
          <textarea id="content" name="content" required><%= safeNotice.content || '' %></textarea>
        </div>

        <div class="submit-wrap">
          <button type="submit"><%= notice ? '공지 수정 저장' : '공지 등록' %></button>
          <a href="/admin/notices">목록으로</a>
        </div>
      </form>
    </div>
  </div>

  <script>
    function renderSinglePreview(file, previewEl, placeholderEl) {
      if (!file || !previewEl) return;

      const url = URL.createObjectURL(file);

      previewEl.innerHTML = '<img src="' + url + '" alt="preview" />';
      previewEl.style.display = 'block';

      if (placeholderEl) placeholderEl.style.display = 'none';
    }

    function renderMultiPreview(files, gridEl, badgeText) {
      if (!gridEl) return;
      gridEl.innerHTML = '';

      Array.from(files).forEach((file) => {
        const url = URL.createObjectURL(file);
        const item = document.createElement('div');
        item.className = 'preview-item';

        item.innerHTML = `
          <div class="preview-badge">${badgeText}</div>
          <img src="${url}" alt="preview">
        `;

        gridEl.appendChild(item);
      });
    }

    function setupUploadBox(boxId, inputId, previewCallback) {
      const box = document.getElementById(boxId);
      const input = document.getElementById(inputId);
      if (!box || !input) return;

      ['dragenter', 'dragover'].forEach(evt => {
        box.addEventListener(evt, (e) => {
          e.preventDefault();
          e.stopPropagation();
          box.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(evt => {
        box.addEventListener(evt, (e) => {
          e.preventDefault();
          e.stopPropagation();
          box.classList.remove('dragover');
        });
      });

      box.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (!dt || !dt.files || !dt.files.length) return;

        input.files = dt.files;
        previewCallback(dt.files);
      });

      input.addEventListener('change', () => {
        if (!input.files || !input.files.length) return;
        previewCallback(input.files);
      });
    }

    setupUploadBox('mainUploadBox', 'mainImageInput', (files) => {
      const file = files[0];
      renderSinglePreview(
        file,
        document.getElementById('mainPreview'),
        document.getElementById('mainPlaceholder')
      );
    });

    setupUploadBox('detailUploadBox', 'detailImagesInput', (files) => {
      renderMultiPreview(files, document.getElementById('detailPreviewGrid'), '본문');
    });
  </script>
</body>
</html>