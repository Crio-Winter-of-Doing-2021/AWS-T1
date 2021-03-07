$(document).ready(function () {

    $("#scheduleTaskForm").validate();

    $("#addParams").click(function () {
      var paramsList = document.getElementById("paramsList");
      var len = paramsList.getElementsByTagName("li").length;
      //len+=1;
      console.log(len);
      //len=2;
      var li = document.createElement("li");
      li.id = "params" + len;
      li.innerHTML =
        "<div class='form-row'><div class='col'><input type='text' class='form-control'" +
        "name='" +
        "key" +
        len +
        "'" +
        "placeholder='key' ></div><div class='col'><input type='text' class='form-control'" +
        "name='" +
        "value" +
        len +
        "' placeholder='value'></div><input class='form-check-input' type='checkbox' name='checkbox" +
        len +
        "' checked>";
      //console.log('hi');
      paramsList.appendChild(li);
    });
  });