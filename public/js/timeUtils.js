$(document).ready(function () {
    //set min date to today and max date to 23 days later
    var today = new Date();
    $("#datefield").attr("min", getDateString(today));
    var maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate()+23);
    $("#datefield").attr("max", getDateString(maxDate));
});

function getDateString(date)
{
    var dd = date.getDate();
    var mm = date.getMonth()+1; //January is 0 so need to add 1 to make it 1!
    var yyyy = date.getFullYear();
    if(dd<10){
      dd='0'+dd
    } 
    if(mm<10){
      mm='0'+mm
    } 
    var res = yyyy+'-'+mm+'-'+dd;
    return res;
}