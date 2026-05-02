function login() {
    fetch("/login", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
            username: username.value,
            password: password.value
        })
    }).then(res=>res.json())
      .then(data=>{
          if(data.success){
              window.location="dashboard.html";
          } else {
              status.innerHTML="Login Failed";
          }
      });
}

function simulate(type){
    fetch("/simulate/"+type);
}

function generateAssets(){
    fetch("/generateAssets").then(()=>loadAssets());
}

function addAsset(){
    fetch("/addAsset",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            name:name.value,
            type:type.value,
            criticality:criticality.value,
            risk:risk.value,
            owner:owner.value,
            environment:environment.value
        })
    }).then(()=>loadAssets());
}

function collectLogs(){
    fetch("/collectLogs");
}

function loadAssets(){
    fetch("/assets")
    .then(res=>res.json())
    .then(data=>{
        const table=document.getElementById("assetTable");
        if(!table) return;
        table.innerHTML="";
        data.forEach(a=>{
            table.innerHTML+=`
            <tr>
            <td><a href="asset.html?id=${a.id}">${a.name}</a></td>
            <td>${a.type}</td>
            <td>${a.criticality}</td>
            <td>${a.risk}</td>
            <td>${a.owner}</td>
            <td>${a.environment}</td>
            </tr>`;
        });
    });
}

if(window.location.pathname.includes("asset.html")){
    const id=new URLSearchParams(window.location.search).get("id");
    fetch("/asset/"+id)
    .then(res=>res.json())
    .then(a=>{
        document.getElementById("assetDetail").innerHTML=`
        <tr><td>ID</td><td>${a.id}</td></tr>
        <tr><td>Name</td><td>${a.name}</td></tr>
        <tr><td>Type</td><td>${a.type}</td></tr>
        <tr><td>Criticality</td><td>${a.criticality}</td></tr>
        <tr><td>Risk</td><td>${a.risk}</td></tr>
        <tr><td>Owner</td><td>${a.owner}</td></tr>
        <tr><td>Environment</td><td>${a.environment}</td></tr>
        <tr><td>Last Updated</td><td>${a.lastUpdated}</td></tr>
        `;
    });
}

loadAssets();
