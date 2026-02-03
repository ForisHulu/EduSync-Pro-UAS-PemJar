const socket = new WebSocket('ws://localhost:8080/ws');
let myPeer;
let localStream;
let userData = { role: "", name: "", id: "" };
let queueData = [];
let votes = { paham: 0, bingung: 0 };
let tempVote = ""; // Untuk menampung status Paham/Bingung sebelum dikirim dengan alasan
let screenStream; // Menyimpan stream layar
let isSharing = false;

// --- 1. INISIALISASI APLIKASI ---
async function initApp() {
    userData.role = document.getElementById('roleInp').value;
    userData.name = document.getElementById('nameInp').value.trim();
    userData.id = document.getElementById('idInp').value.trim();

    // 1. Validasi Nama
if (!userData.name) {
    alert("Nama tidak boleh kosong!");
    return;
}

// 2. Cek apakah Input Induk hanya berisi angka
if (!/^\d+$/.test(userData.id)) {
    alert("Nomor induk (NIP/NPM) harus berupa angka!");
    return;
}

// 3. Validasi Panjang Karakter sesuai Peran
if (userData.role === 'dosen') {
    if (userData.id.length !== 5) {
        alert("NIP Dosen harus tepat 5 angka!");
        return;
    }
} else if (userData.role === 'mahasiswa') {
    if (userData.id.length !== 9) {
        alert("NPM Mahasiswa harus tepat 9 angka!");
        return;
    }
}

    // Sembunyikan Login & Tampilkan Nama User
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('displayUserName').innerText = userData.name.toUpperCase();

    // Pengaturan UI Berdasarkan Peran (Role)
    if (userData.role === 'dosen') {
        document.getElementById('dosenVoteTools').classList.remove('hidden');
        document.getElementById('dosenQueueTools').classList.remove('hidden');
    } else {
        document.getElementById('btnMhsIzin').classList.remove('hidden');
    }

    // Akses Kamera & Mikrofon
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = localStream;
        document.getElementById('localTag').innerText = `Anda (${userData.name})`;
    } catch (e) { 
        console.error("Gagal akses kamera:", e);
        alert("Kamera tidak ditemukan atau akses ditolak.");
    }

    // Konfigurasi PeerJS
    // Dosen menggunakan ID tetap 'host-dosen', Mahasiswa menggunakan ID unik berdasarkan NPM/Waktu
    const peerId = userData.role === 'dosen' ? 'host-dosen' : 'mhs-' + (userData.id || Date.now());
    myPeer = new Peer(peerId);

    myPeer.on('open', (id) => {
        console.log("Connected to Peer Server with ID:", id);
        if (userData.role === 'mahasiswa') {
            // Mahasiswa otomatis menelepon Dosen saat bergabung
            const call = myPeer.call('host-dosen', localStream, { metadata: { name: userData.name } });
            connectToNewUser(call);
        }
    });

    myPeer.on('call', (call) => {
        call.answer(localStream);
        connectToNewUser(call);
    });
}

function connectToNewUser(call) {
    call.on('stream', (remoteStream) => {
        if (document.getElementById(`container-${call.peer}`)) return;
        
        const grid = document.getElementById('video-grid');
        const container = document.createElement('div');
        container.className = 'video-container';
        container.id = `container-${call.peer}`;

        const vid = document.createElement('video');
        vid.srcObject = remoteStream;
        vid.autoplay = true;

        const label = document.createElement('div');
        label.className = 'user-label';
        label.innerText = call.peer === 'host-dosen' ? "DOSEN" : (call.metadata?.name || "Peserta");

        container.append(vid, label);
        grid.append(container);
    });
}

// --- 2. FITUR BAROMETER DENGAN ALASAN ---

// Ganti nama fungsi agar lebih formal
function startCekPemahaman() {
    socket.send(JSON.stringify({ type: "START_SESSION", duration: 15 }));
}

// PASTIKAN NAMANYA selectVote
function selectVote(val) {
    tempVote = val; 
    document.getElementById('voteStatusTitle').innerText = (val === 'PAHAM') ? "Hebat! Apa yang dipahami?" : "Waduh, bagian mana yang bingung?";
    document.getElementById('voteInstruction').innerText = "Berikan alasan singkat agar Dosen tahu kondisimu.";
    document.getElementById('voteStep1').classList.add('hidden');
    document.getElementById('voteStep2').classList.remove('hidden');
}   
function cancelVote() {
    document.getElementById('voteStep1').classList.remove('hidden');
    document.getElementById('voteStep2').classList.add('hidden');
    document.getElementById('voteStatusTitle').innerText = "Cek Pemahaman";
}

function finalSubmitVote() {
    const reasonText = document.getElementById('voteReason').value.trim() || "Tidak ada alasan spesifik.";
    
    // Kirim data ke WebSocket
    socket.send(JSON.stringify({ 
        type: "VOTE", 
        username: userData.name, 
        payload: tempVote, 
        reason: reasonText 
    }));

    // Reset Tampilan Pop-up
    document.getElementById('voteOverlay').classList.add('hidden');
    document.getElementById('voteStep1').classList.remove('hidden');
    document.getElementById('voteStep2').classList.add('hidden');
    document.getElementById('voteReason').value = "";
}

function resetBarometer() {
    socket.send(JSON.stringify({ type: "RESET_VOTE" }));
}

function resetLocalVotes() {
    votes = { paham: 0, bingung: 0 };
    updateBarUI();
}

function updateBarUI() {
    const total = votes.paham + votes.bingung;
    const pWidth = total === 0 ? 50 : (votes.paham / total) * 100;
    const bWidth = total === 0 ? 50 : (votes.bingung / total) * 100;
    
    document.getElementById('barPaham').style.width = pWidth + "%";
    document.getElementById('barBingung').style.width = bWidth + "%";
    document.getElementById('labelPaham').innerText = `PAHAM: ${votes.paham}`;
    document.getElementById('labelBingung').innerText = `BINGUNG: ${votes.bingung}`;
}

// --- 3. FITUR ANTRIAN (QUEUE) ---

function requestQueue() {
    socket.send(JSON.stringify({ type: "QUEUE_REQUEST", username: userData.name, timestamp: Date.now() }));
    const btn = document.getElementById('btnMhsIzin');
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-clock"></i> MENUNGGU...`;
}

function nextQueue() {
    socket.send(JSON.stringify({ type: "NEXT_QUEUE" }));
}

function clearQueue() {
    queueData = [];
    renderQueue();
}

function renderQueue() {
    const container = document.getElementById('queueListContainer');
    if (queueData.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#ccc; font-size:12px; padding:10px;">Belum ada antrian...</p>`;
        return;
    }
    container.innerHTML = "";
    queueData.forEach((q, idx) => {
        const item = document.createElement('div');
        item.className = 'q-item';
        item.innerHTML = `<div class="q-name">${q.name}</div><div class="q-rank">${idx + 1}</div>`;
        container.appendChild(item);
    });
}

// --- 4. FITUR CHAT & LOG ---

function sendChat() {
    const inp = document.getElementById('chatInput');
    if (inp.value.trim()) {
        socket.send(JSON.stringify({ type: "CHAT", username: userData.name, payload: inp.value }));
        inp.value = "";
    }
}

function appendChat(sender, message, isSystem = false, status = "") {
    const chatBox = document.getElementById('chatBox');
    const msgDiv = document.createElement('div');
    
    // Jika isSystem true, kita beri gaya khusus
    const isMe = sender === userData.name;
    msgDiv.className = `msg ${isMe ? 'me' : 'other'}`;
    
    // Logika Label Status (Paham/Bingung)
    let statusLabel = "";
    if (isSystem && status === "PAHAM") {
        statusLabel = `<span style="background:#2ecc71; color:white; padding:2px 6px; border-radius:4px; font-size:9px; margin-left:5px;">PAHAM</span>`;
    } else if (isSystem && status === "BINGUNG") {
        statusLabel = `<span style="background:#e74c3c; color:white; padding:2px 6px; border-radius:4px; font-size:9px; margin-left:5px;">BINGUNG</span>`;
    }

    msgDiv.innerHTML = `
        <span class="msg-sender">${isMe ? 'Anda' : sender} ${statusLabel}</span>
        <div class="msg-text">${message}</div>
    `;
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- 5. WEBSOCKET MESSAGE HANDLER ---

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case "START_SESSION":
            if (userData.role === 'mahasiswa') document.getElementById('voteOverlay').classList.remove('hidden');
            resetLocalVotes();
            break;

      case "VOTE":
            if (data.payload === 'PAHAM') votes.paham++;
            else votes.bingung++;
            updateBarUI();
            
            // Tampilan untuk Dosen: Muncul di chat dengan label status
            if (userData.role === 'dosen') {
                // Parameter: sender, message, isSystem(true), status(PAHAM/BINGUNG)
                appendChat(data.username, data.reason, true, data.payload);
            }
            break;

        case "QUEUE_REQUEST":
            if (!queueData.find(q => q.name === data.username)) {
                queueData.push({ name: data.username, time: data.timestamp });
                queueData.sort((a, b) => a.time - b.time);
                renderQueue();
            }
            break;

        case "NEXT_QUEUE":
            const nextPerson = queueData.shift();
            if (nextPerson && nextPerson.name === userData.name) {
                alert("📢 GILIRAN ANDA! Silakan aktifkan mic untuk bicara.");
                const btn = document.getElementById('btnMhsIzin');
                btn.disabled = false;
                btn.innerHTML = `<i class="fas fa-hand-paper"></i> IZIN BICARA`;
            }
            renderQueue();
            break;

        case "CHAT":
            appendChat(data.username, data.payload);
            break;
            
        case "RESET_VOTE":
            resetLocalVotes();
            break;
    }
};

// --- 6. MEDIA CONTROLS ---

function toggleMic() {
    const track = localStream.getAudioTracks()[0];
    track.enabled = !track.enabled;
    document.getElementById('micBtn').classList.toggle('active', !track.enabled);
    document.getElementById('micBtn').innerHTML = track.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
}

function toggleCam() {
    const track = localStream.getVideoTracks()[0];
    track.enabled = !track.enabled;
    document.getElementById('camBtn').classList.toggle('active', !track.enabled);
    document.getElementById('camBtn').innerHTML = track.enabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
}

// --- FITUR TAMBAHAN SHARE SCREEN & MIRROR FIX ---
async function toggleScreenShare() {
    const localVid = document.getElementById('localVideo');
    const screenBtn = document.getElementById('screenBtn');

    if (!isSharing) {
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            isSharing = true;
            
            // HAPUS efek cermin saat share screen
            localVid.classList.remove('mirror-effect'); 
            
            localVid.srcObject = screenStream;
            screenBtn.classList.add('active');
            screenBtn.innerHTML = `<i class="fas fa-stop-circle"></i>`;

            replaceVideoTrack(screenStream.getVideoTracks()[0]);

            screenStream.getVideoTracks()[0].onended = () => stopSharing();
        } catch (err) { console.error("Gagal share screen:", err); }
    } else {
        stopSharing();
    }
}

function stopSharing() {
    isSharing = false;
    const localVid = document.getElementById('localVideo');
    const screenBtn = document.getElementById('screenBtn');

    // PASANG LAGI efek cermin saat kembali ke kamera
    localVid.classList.add('mirror-effect'); 
    
    localVid.srcObject = localStream;
    screenBtn.classList.remove('active');
    screenBtn.innerHTML = `<i class="fas fa-desktop"></i>`;

    replaceVideoTrack(localStream.getVideoTracks()[0]);
    
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
    }
}

function replaceVideoTrack(newTrack) {
    for (let peerId in myPeer.connections) {
        myPeer.connections[peerId].forEach(call => {
            if (call.peerConnection) {
                const sender = call.peerConnection.getSenders().find(s => s.track.kind === 'video');
                if (sender) sender.replaceTrack(newTrack);
            }
        });
    }
}