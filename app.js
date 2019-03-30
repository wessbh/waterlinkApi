const express = require ('express');
const app = express();
const mysql = require ('mysql');
var passwordHash = require('password-hash');
var randomstring = require("randomstring");
var dateFormat = require('dateformat');
var bodyParser = require('body-parser');
const hostname = '0.0.0.0';
const port = 3000;
http = require('http');
server = http.createServer(app)
var tot = 0;
var previous_total = 0;

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json());

// New Date Initialization
var now = new Date();
now = dateFormat("d/m/yyyy");
// Database Connection
const db = mysql.createConnection({
    host : 'localhost',
    user : 'root',
    password : '',
    database : 'waterlink'
});
// Connect 
db.connect((err)=>{
    if (err) throw err;
    console.log('Connected to Mysql...');
});
//------------------PUSH NOTIFICATION CONFIG---------------------\\
var FCM = require('fcm-node');
//referenceKey = 'czPwaiZTzQI:APA91bH67RPhbMAV_8UbcnWzy8abcfBy_6XB6N0q06n1NAtbHlmRezOtKkWx8sQUdJ5oHaT-nWSXX39JSVT_7UKFfH_pMMlT3qBAXtBptJyJM_7u5BKzjQn8H8ijriUiUhD04ZvGUFAQ'; //Device Key
var serverKey = 'AAAAPuk5zrk:APA91bHLxGWnZhau77Gg4ac3PwS6KaiC55JdZRS2Fx9Rur-BnmeuO6SYpkzscWYFTApoSSyQ7TZ6mpHNEgqqDZRTmp9ptrsRo5cwtEJqJhIyFV_aJMcgZgmJcHRUbgPvF3parGHlCnLT'; //put your server key here
var fcm = new FCM(serverKey);
function sendPushNotification(num_contrat, title, notification_body){
    var type = 'test';
    db.query('SELECT device_token FROM user where num_contrat = '+num_contrat,  (err, rows, fields) => {
        if (!err){
            var referenceKey = rows[0].device_token;
            var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
                to: referenceKey,
                
                notification: {
                    title: title, 
                    body: notification_body
                },
                
                data: {  //you can send only notification or only data(or include both)
                    "name": 'wassim',
                    'product': 'PC'
                }
            };
            fcm.send(message, function(err, response){
                if (err) {
                    console.log("Something has gone wrong!");
                } else {
                    console.log('device_token: '+referenceKey);
                    console.log("Successfully sent with response: ", response);
                }
            });
        }
        else
            console.log(err);
    })
}   
app.get('/sendnotifiation',(req, res) =>{
    sendPushNotification(556677, 'Sleep Warning', 'DON\'T FUCKIN SLEEP' );
    res.send('chouf trah?');
});
//----------------------------------------------------------------\\

//-------------------WEBSOCKET CONFIG------------------------------\\
io = require('socket.io').listen(server);
io.on('connection', (socket) => {
    console.log('connected');
    let message = {'message' : tot};
    socket.emit('message', message);
      socket.on('user_id', function (num_contrat) {
        console.log(num_contrat);
          setInterval(function(data){
            var sql = 'SELECT valeur FROM consommation where id_user ='+num_contrat;
            db.query(sql, function(err, rows, fields) {
                if (err) throw err;
                var message = {'message' : rows[0].valeur};
             socket.emit('message', message);
             console.log(''+rows[0].valeur); 
              previous_total = rows[0].valeur;
              });
            },1000);
      });
      socket.on('user_disconnected', function (message) {
        console.log(message);
    });
});
//-------------------------------------------------\\

app.post('/adduser', (req, res) => {
    var num_contrat = req.body.num_contrat;
    var nom = req.body.nom;
    var prenom = req.body.prenom;
    var num_tel = req.body.num_tel;
    var region = req.body.region;
    var code_postal = req.body.code_postal;
    var mail = req.body.mail;
    var password = encrypt(req.body.password);
    var api_key = generateApiKey();

    var state = false;
    var sql = 'SELECT * FROM user where num_contrat ='+num_contrat;
    db.query(sql,(err, rows, fields) => {
        if (rows.length == 0){
            const sql = 'INSERT INTO `user`(`num_contrat`, `nom`, `prenom`, `num_tel`, `region`, `code_postal`, `mail`, `password`, `api_key`) VALUES (?,?,?,?,?,?,?,?,?)';
            db.query(sql,[num_contrat, nom, prenom, num_tel, region, code_postal, mail, password, api_key], (err, rows, fields) => {
                if (!err){
                    console.log('Done! '+num_contrat);
                }
                else
                    console.log(err);
            })
        }
        else{
            console.log(state);
            console.log(rows.length);}
    })
});
//Get a user
app.get('/user/:id', (req, res) => {
    db.query('SELECT * FROM user WHERE id = ?', [req.params.id], (err, rows, fields) => {
        if (!err)
            res.send(rows);
        else
            console.log(err);
    })
});
// 
//Get all user
app.get('/users', (req, res) => {
    db.query('SELECT * FROM user',  (err, rows, fields) => {
        if (!err)
            res.send({users: rows});
        else
            console.log(err);
    })
});
// Login  
app.post('/login', (req, res) => {
    var num_contrat = req.body.num_contrat;
    var password = req.body.password;
    //var password = encrypt(req.body.password);
    db.query('SELECT * FROM user where num_contrat ='+num_contrat,(err, rows, fields) => {
        if (rows){
            if(decrypt(password, rows[0].password)){
                res.send({error: false, user: rows});
            }
            else
                res.send({error: true, message: 'Mot de Passe incorrecte'});
        }
        else{
        res.send('Erreur');
        console.log(num_contrat);
        }

    });
});

//Get Total consommation
app.get('/total/:id', (req, res) => {
    db.query('SELECT * FROM consommation WHERE id_user = ?', [req.params.id], (err, rows, fields) => {
        if (!err)
            res.send({consommation: rows});
        else
            console.log(err);
    })
});
//Update Seuil
app.get('/update_seuil', (req, res) => {
    var user_id = req.query.user_id;
    var seuil_value = req.query.seuil;
    var sql = 'UPDATE `consommation` SET `seuil`= '+seuil_value+' WHERE id_user = '+user_id;
    db.query(sql, (err, rows, fields) => {
        if (!err){
            res.send({'message': 'seuil à jours'});
        }
        else
            console.log(err);
    })
});
// udpate consommation
app.put('/update_consommation', (req, res) => {
    var id_user = req.body.id_user;
    var valeur =parseInt(req.body.valeur);
    var total = 0;
    db.query('SELECT total FROM consommation where id_user = '+id_user,  (err, rows, fields) => {
        if (!err){
            total = parseInt(rows[0].total)+valeur;
            //sql = 'UPDATE `consommation` SET `valeur`='+valeur+',`total`='+total+' WHERE id = 1';  
            sql = 'UPDATE `consommation` SET `valeur`= ?,`total`= ? WHERE id_consommation = 1';    
            db.query(sql,[valeur, total], (err, rows, fields) => {
                if (!err){
                res.status(200).send({ok: "Consommation à jours"});
                }
                else {
                    res.status(500).send({ error: "un probléme c'est passé" });
                }
                    
            })
        }
        else
            console.log(err)   ;
    })
    
});
// Toggle consommation, cette fonction est à la place d'un capteur d'impulsion qui va fournir les données 
// CETTE FONCTION EST SEULEMENT POUR LES TESTS
app.get('/toggle_consommation/:status', (req, res) => {
    var update = 0;
    if(req.params.status == 'on'){
        update= setInterval(function(){update_consommation(556677)},1000);
        console.log('ON');
        res.send('Sending Data...');
    }
    if (req.params.status == 'off'){
        update = 0;
        clearInterval(update);
        console.log('OFF');
        res.send('Stopped !');
    }

});

app.get('/', (req, res) => {
    res.send({Message: 'Hello :)'});
    console.log('Hello !')

});
app.get('/testprix', (req, res) => {
    res.send({'Prix': getPourcentage(40, 30)});

});

app.get('/reset', (req,res) => {
    var id_user = req.query.id_user;
    sql = 'UPDATE `consommation` SET `valeur`= 0,`total`= 0,`prix`= 0,`tranche`= 200,`alert_sent` = 0  WHERE id_user = ?';    
    db.query(sql,[id_user], (err, rows, fields) => {
        if (err){
            console.log(err);
         }
         else {res.send({'message': 'mise à zéro avec succés'})}
    });
});
//Get totale
app.get('/get_total', (req, res) => {


    db.query('SELECT total FROM consommation where id = 1',  (err, rows, fields) => {
        if (!err){
            res.send({posts: rows});
            console.log(rows[0].totale);
            var totale = parseInt(rows[0].totale);
        }
        else
            console.log(err);
    });
});
    function encrypt(password){
        var hashedPassword = passwordHash.generate(password);
        return hashedPassword;
    }
    function decrypt(password, hashed_password){
        return passwordHash.verify(password, hashed_password);
    }
    function generateApiKey(){
      return randomstring.generate(40);
    }
    function update_consommation(num_contrat){
        var valeur =20;
        var prix = 0;
        var tranche = 0;
        var random = Math.round(Math.random() * (+70 - +0) + +0);
        var total = 0;
        var seuil = 0;
        db.query('SELECT total, seuil, alert_sent FROM consommation where id_consommation = 1',  (err, rows, fields) => {
            if (!err){
                total = parseInt(rows[0].total)+random;
                seuil = parseInt(rows[0].seuil);
                alert_sent = parseInt(rows[0].alert_sent);
                tot = total;
                prix = getPrix(total);
                tranche = getTranche(total);
                checkSeuil(num_contrat, seuil, prix, alert_sent);
                console.log('totale: '+total);
                console.log('prix: '+prix);
                console.log('Alert: '+alert_sent);
                //sql = 'UPDATE `consommation` SET `valeur`='+valeur+',`total`='+total+' WHERE id = 1';
                sql = 'UPDATE `consommation` SET `valeur`= ?,`total`= ?,`prix`= ?,`tranche`= ?  WHERE id_consommation = 1';    
                db.query(sql,[random, total, prix, tranche], (err, rows, fields) => {
                    if (err){
                        console.log(err);
                    }
                })
            }
            else
                console.log(err);
        });
  }
  app.post('/add_device_id', (req, res) => {
    var num_contrat = req.body.num_contrat;
    var token = req.body.token;
      sql = 'UPDATE `user` SET `device_token`= ? WHERE num_contrat = ?';
      db.query(sql,[token, num_contrat], (err, rows, fields) => {
          if(!err){
            res.send({'message': 'Done !'});
            console.log('Token updated');
          }
          else{
          res.send('Erreur');
          console.log(sql);
          }
      });
  });

function getTranche(total_litres){
    var tranche = 0;
    var total = total_litres / 1000; // total est en métre cubes   1m3 = 1000 litre
        if(total <= 20.999){
            tranche = 200;
        }
        if(total >= 21 && total <= 40.999){
            tranche = 325;
        }
        if(total >= 41 && total <= 70.999){
            tranche = 450;
        }
        if(total >= 71 && total <= 100.999){
            tranche = 770;
        }
        if(total >= 101 && total <= 150.999){
            tranche = 940;
        }
        if(total >= 151 && total <= 500.999){
            tranche = 1260;
        }
        if(total >= 501){
            tranche = 1315; 
        }
        return  tranche;
}  

function getPrix(total_litres){
    var prix = 1;
    var total = total_litres / 1000; // total est en métre cubes   1m3 = 1000 litre
    console.log(total);
    if(total <= 20){
        prix = total * 200;
    }
    if(total >= 21 && total <= 40){
        prix = total * 325;
    }
    if(total >= 41 && total <= 70){
        console.log('i\'m here');
        prix = total * 450;
    }
    if(total >= 71 && total <= 100){
        prix = total * 770;
    }
    if(total >= 101 && total <= 150){
        prix = total * 940;
    }
    if(total >= 151 && total <= 500){
        prix = total * 1260;
    }
    if(total >= 501){
        prix = 1315;
    }
    prix_converted = prix/1000;
    prix_converted =  prix_converted.toFixed(3);
    return prix_converted;
}
function getPourcentage(seuil, prix){
    var pourcentage= 0;
    pourcentage = (prix / seuil)*100;
    return pourcentage;
}
function checkSeuil(num_contrat, seuil, prix, alert_sent){
    if((seuil - prix <= 10)&&(alert_sent == 0)){
        sendPushNotification(num_contrat,'Attention !', 'Votre consommation risque à dépasser la seuil');
        var sql = 'UPDATE `consommation` SET `alert_sent`=1 WHERE id_user = '+num_contrat;
        db.query(sql, (err, rows, fields) => {
            if (!err){
                console.log('Etat d\'Alert est à jours');
            }
            else
                console.log(err);
        });
    }
    if((seuil - prix >= 0)&&(alert_sent == 1)){
        sendPushNotification(num_contrat,'Attention !', 'Vous avez dépassé la seuil');
        var sql = 'UPDATE `consommation` SET `alert_sent`= 2 WHERE id_user = '+num_contrat;
        db.query(sql, (err, rows, fields) => {
            if (!err){
                console.log('Etat d\'Alert est à jours');
            }
            else
                console.log(err);
        });
    }
}
server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
  });
    
  